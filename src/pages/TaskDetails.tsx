import { Button } from "@/components/ui/button";
import ClientViewShareButton from "@/components/ClientViewShareButton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { 
  X, Send, Clock, User2, MessageSquare, User, Clock4, AlertCircle, 
  MessageCircle, ChevronRight, Check, CheckCheck, Paperclip, Upload, 
  Trash2, FileText, Download, Search, Star, RefreshCw, Calendar, 
  Building2, MoreHorizontal, ListChecks, Activity as ActivityIcon, 
  Files as FilesIcon, Pencil, Plus, FolderPlus, ChevronDown, ChevronUp,
  ChevronLeft as ChevronLeftIcon, Eye, ExternalLink, Loader2, Lock
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TaskEditDrawer from "@/components/dashboard/TaskEditDrawer";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Task, TaskComment, TaskAccess } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useBreakpoint } from "@/hooks/use-breakpoint";

import CompanyBadge from "@/components/CompanyBadge";
import AttachmentPreview from "@/components/AttachmentPreview";
import FilePreviewCard from "@/components/tasks/FilePreviewCard";
import SubtaskList from "@/components/tasks/SubtaskList";
import TaskActivityTimeline from "@/components/tasks/TaskActivityTimeline";
import TaskWatcherSection from "@/components/tasks/TaskWatcherSection";
import GoogleDrivePickerDialog from "@/components/tasks/GoogleDrivePickerDialog";
import { getTaskSubtaskCount, getTaskWatcherCount } from "@/lib/taskListUtils";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useGoogleDriveFiles } from "@/hooks/useGoogleDriveFiles";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// Define the correct User type based on your database schema
interface CorrectedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  profilePictureUrl?: string;
}

interface CorrectedTaskComment extends Omit<TaskComment, 'user'> {
  user: CorrectedUser;
}

const TaskDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, activeCompanyId } = useAuth();
  const { canPerformRoleOperation } = useWorkspaceSettings();
  const { toast } = useToast();
  const { isConnected, joinTaskRoom, leaveTaskRoom, sendComment, sendTypingIndicator, on, off } = useWebSocket();
  const queryClient = useQueryClient();

  const [task, setTask] = useState<Task | null>(null);
  const [taskAccess, setTaskAccess] = useState<TaskAccess | null>(null);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<CorrectedTaskComment[]>([]);
  
  // NEW: State for description expansion
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  // NEW: State for collapsible collaboration panel
  const [collabPanelOpen, setCollabPanelOpen] = useState(true);

  const taskQuery = useQuery({
    queryKey: ["task-details", id],
    queryFn: async () => {
      if (!id) throw new Error("No task id");
      try {
        const response = await api.getTaskById(id);
        return response.data;
      } catch (err: any) {
        if (err?.status === 403) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to view this task.",
            variant: "destructive"
          });
        }
        throw err;
      }
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const commentsQuery = useQuery({
    queryKey: ["task-comments", id],
    queryFn: async () => {
      if (!id) throw new Error("No task id");
      const response = await api.getTaskComments(id, { limit: 50 });
      return (response.comments || []).filter(Boolean).map(fixCommentProfilePicture);
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Sync state with query data
  useEffect(() => {
    if (taskQuery.data) {
      setTask(taskQuery.data.task ?? null);
      setTaskAccess(taskQuery.data.access ?? null);
    }
  }, [taskQuery.data]);

  // The backend access object is the final authority: treat the task as
  // read-only whenever editing is not explicitly permitted.
  const isReadOnly = taskAccess
    ? taskAccess.readOnly === true || taskAccess.canEdit === false
    : false;

  useEffect(() => {
    if (commentsQuery.data) {
      setComments(commentsQuery.data);
    }
  }, [commentsQuery.data]);
  
  const [sendingComment, setSendingComment] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [preview, setPreview] = useState<{
    url: string;
    type: string;
    name: string;
    attachmentId?: string;
    alreadyInDocs?: boolean;
  } | null>(null);
  const [addingToDocs, setAddingToDocs] = useState(false);
  
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [pendingComments, setPendingComments] = useState<Map<string, {content: string, timestamp: number}>>(new Map());
  const [showChatSheet, setShowChatSheet] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [savingToDrive, setSavingToDrive] = useState<string | null>(null);

  // Workbench state
  const { isMobile, isTablet } = useBreakpoint();
  const [rightTab, setRightTab] = useState<"chat" | "files" | "activity" | "edit">("chat");
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState<string>("all");
  const [listPage, setListPage] = useState(1);
  const [listSort, setListSort] = useState<"due" | "created" | "priority">("created"); // CHANGED: default to "created"
  const [listScope, setListScope] = useState<"workspace" | "all_workspaces">("workspace");
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: string; name?: string } | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const leftSearchRef = useRef<HTMLInputElement>(null);

  // Responsive panel state
  const [listPanelOpen, setListPanelOpen] = useState(true);
  const [collabSheetOpen, setCollabSheetOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<null | "list" | "chat" | "files" | "activity" | "edit">(null);

  // Read-only tasks expose no edit surface — keep the panel on a viewable tab.
  useEffect(() => {
    if (isReadOnly && rightTab === "edit") setRightTab("chat");
  }, [isReadOnly, rightTab]);

  // Close mobile/tablet overlays whenever the selected task changes
  useEffect(() => {
    setMobilePanel(null);
    setCollabSheetOpen(false);
  }, [id]);

  // Keyboard shortcuts: "/" or Cmd/Ctrl+K to focus left search; 1-4 to switch right tabs.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (target as any)?.isContentEditable;

      // Cmd/Ctrl+K → focus search (works even while typing elsewhere)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        leftSearchRef.current?.focus();
        leftSearchRef.current?.select();
        return;
      }

      if (typing) return;

      if (e.key === "/") {
        e.preventDefault();
        leftSearchRef.current?.focus();
        return;
      }

      if (["1", "2", "3", "4"].includes(e.key)) {
        const map: Record<string, "chat" | "files" | "activity" | "edit"> = {
          "1": "chat",
          "2": "files",
          "3": "activity",
          "4": "edit",
        };
        setRightTab(map[e.key]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const listQuery = useQuery({
    queryKey: ["task-workbench-list", { listSearch, listStatus, listPage, activeCompanyId, listScope }],
    queryFn: () =>
      api.getAllTasksCrossWorkspace({
        page: listPage,
        limit: 25,
        search: listSearch || undefined,
        status: listStatus === "all" ? undefined : listStatus,
        companyId: activeCompanyId || undefined,
        scope: listScope,
      }),
  });
  const listTasks: Task[] = (listQuery.data?.data?.tasks || []) as any;
  const sortedListTasks = useMemo(() => {
    const arr = [...listTasks];
    if (listSort === "due") arr.sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    else if (listSort === "created") arr.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (listSort === "priority") {
      const rank: any = { urgent: 0, high: 1, medium: 2, low: 3 };
      arr.sort((a: any, b: any) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9));
    }
    return arr;
  }, [listTasks, listSort]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const { uploadToGoogleDrive, uploadLoading } = useGoogleDriveFiles({ enabled: false });
  const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optimisticCommentRef = useRef<Map<string, any>>(new Map());

  // WebSocket setup
  useEffect(() => {
    if (!id || !isConnected) return;

    // Join task room
    joinTaskRoom(id);

    // Set up WebSocket listeners
    const handleNewComment = (message: any) => {
      console.log('📨 WebSocket comment received:', message);
      
      if (message.comment && message.taskId === id) {
        // Fix the profilePicture field if needed
        const fixedComment = fixCommentProfilePicture(message.comment);
        
        const echoedMessageId =
          message.messageId ||
          message.comment?.metadata?.messageId ||
          message.comment?.messageId;

        if (echoedMessageId && optimisticCommentRef.current.has(echoedMessageId)) {
          console.log('Processing echoed optimistic comment:', echoedMessageId);
          removeOptimisticComment(echoedMessageId);
          setComments(prev => {
            const alreadyExists = prev.some(c => c.id === fixedComment.id);
            if (alreadyExists) return prev;
            return [...prev, fixedComment];
          });
        } else {
          setComments(prev => {
            const alreadyExists = prev.some(c => c.id === fixedComment.id);
            if (alreadyExists) {
              return prev;
            }
            return [...prev, fixedComment];
          });
        }
        
        scrollToBottom();
      }
    };

    const handleCommentUpdated = (message: any) => {
      if (message.comment && message.comment.taskId === id) {
        const fixedComment = fixCommentProfilePicture(message.comment);
        setComments(prev => 
          prev.map(comment => 
            comment.id === fixedComment.id ? fixedComment : comment
          )
        );
      }
    };

    const handleCommentDeleted = (message: any) => {
      if (message.taskId === id || comments.some(c => c.id === message.commentId)) {
        setComments(prev => prev.filter(comment => comment.id !== message.commentId));
      }
    };

    const handleTaskUpdated = (message: any) => {
      if (message.task && message.task.id === id) {
        setTask(message.task);
        toast({
          title: "Task updated",
          description: "Task has been updated",
        });
      }
    };

    const handleUserJoined = (message: any) => {
      if (message.userId && message.userId !== user?.id) {
        setOnlineUsers(prev => new Set([...prev, message.userId]));
      }
    };

    const handleUserLeft = (message: any) => {
      if (message.userId) {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(message.userId);
          return newSet;
        });
      }
    };

    const handleTypingIndicator = (message: any) => {
      if (message.userId !== user?.id && message.taskId === id) {
        if (message.isTyping) {
          setTypingUsers(prev => new Set([...prev, message.userId]));
          
          // Clear typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(message.userId);
              return newSet;
            });
          }, 3000);
        } else {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(message.userId);
            return newSet;
          });
        }
      }
    };

    const handleConnectionEstablished = () => {
      console.log('✅ WebSocket connection established');
    };

    const handleError = (message: any) => {
      console.error('WebSocket error:', message);
      
      if (message.type === 'comment_error') {
        toast({
          title: "Failed to send comment",
          description: message.message || "Please try again",
          variant: "destructive",
        });
        
        // Remove any pending optimistic comments
        const messageId = Object.keys(optimisticCommentRef.current).find(
          key => optimisticCommentRef.current.get(key)?.content === message.comment?.content
        );
        
        if (messageId) {
          setComments(prev => prev.filter(comment => 
            !comment.id.startsWith('optimistic-') || 
            comment.metadata?.messageId !== messageId
          ));
          optimisticCommentRef.current.delete(messageId);
        }
      } else {
        toast({
          title: "Chat Error",
          description: message.message || "Connection issue",
          variant: "destructive",
        });
      }
    };

    // Register handlers
    on('new_comment', handleNewComment);
    on('comment_updated', handleCommentUpdated);
    on('comment_deleted', handleCommentDeleted);
    on('task_updated', handleTaskUpdated);
    on('user_joined', handleUserJoined);
    on('user_left', handleUserLeft);
    on('typing_indicator', handleTypingIndicator);
    on('connection_established', handleConnectionEstablished);
    on('error', handleError);

    // Cleanup on unmount
    return () => {
      if (id) {
        leaveTaskRoom(id);
      }
      off('new_comment', handleNewComment);
      off('comment_updated', handleCommentUpdated);
      off('comment_deleted', handleCommentDeleted);
      off('task_updated', handleTaskUpdated);
      off('user_joined', handleUserJoined);
      off('user_left', handleUserLeft);
      off('typing_indicator', handleTypingIndicator);
      off('connection_established', handleConnectionEstablished);
      off('error', handleError);
    };
  }, [id, isConnected, user?.id]);

  // Helper function to fix profile picture field in comments
  const fixCommentProfilePicture = (comment: any): CorrectedTaskComment => {
    return {
      ...comment,
      user: comment.user
        ? {
            ...comment.user,
            profilePictureUrl: comment.user.profilePicture || comment.user.profilePictureUrl || undefined
          }
        : { id: "", firstName: "", lastName: "", email: "", role: "" }
    };
  };

  // Clear optimistic comments on error or when they get too old
  useEffect(() => {
    const interval = setInterval(() => {
      setComments(prev => {
        const now = Date.now();
        const filtered = prev.filter(comment => {
          if (comment.id.startsWith('optimistic-')) {
            // Remove optimistic comments older than 30 seconds
            const timestampMatch = comment.id.match(/optimistic-(\d+)-/);
            if (timestampMatch) {
              const timestamp = parseInt(timestampMatch[1]);
              if (now - timestamp > 30000) {
                console.log('Removing stale optimistic comment:', comment.id);
                return false;
              }
            }
          }
          return true;
        });
        
        if (filtered.length !== prev.length) {
          return filtered;
        }
        return prev;
      });
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    if (!task || isReadOnly) return;

    try {
      setUpdating(true);
      const isPrivileged =
        user?.role === "admin" ||
        user?.role === "executive" ||
        user?.role === "manager" ||
        user?.id === task.creator?.id;

      if (isPrivileged) {
        await api.updateTask(task.id, { status: newStatus as any });
      } else {
        await api.updateTaskProgress(task.id, { status: newStatus });
      }
      toast({ title: "Success", description: "Task status updated" });
      taskQuery.refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isChat = false) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !id || isReadOnly) return;

    try {
      setUploadingFiles(true);
      const response = await api.uploadTaskAttachments(id, files);
      const updatedTask = response.data.task;
      setTask(updatedTask);

      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`,
      });

      if (isChat) {
        // Post a comment about the uploaded file(s)
        const fileNames = files.map(f => f.name).join(", ");
        const content = `📎 Uploaded ${files.length} file(s): ${fileNames}`;
        
        // Use the existing handleSendComment logic but with pre-filled content
        setNewComment(content);
        // We'll trigger send immediately after this state update in a timeout or just call send logic
        setTimeout(() => handleSendComment(content), 100);
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles(false);
      if (e.target) e.target.value = "";
    }
  };

  const confirmDeleteAttachment = async () => {
    const attachmentId = attachmentToDelete?.id;
    if (!attachmentId || isReadOnly) return;
    try {
      await api.deleteTaskAttachment(attachmentId);
      setTask(prev => prev ? {
        ...prev,
        attachments: prev.attachments?.filter(a => a.id !== attachmentId)
      } : null);
      toast({
        title: "Success",
        description: "Attachment deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attachment",
        variant: "destructive",
      });
    } finally {
      setAttachmentToDelete(null);
    }
  };

  const handleDeleteAttachment = (attachmentId: string, name?: string) => {
    setAttachmentToDelete({ id: attachmentId, name });
  };

  const handleAttachGoogleDriveFile = async (driveAttachment: {
    fileId: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
    thumbnailLink?: string;
    source: "google-drive";
  }) => {
    if (!id || isReadOnly) return;
    try {
      setUpdating(true);

      const attachment = await api.attachGoogleDriveFile(id, {
        fileId: driveAttachment.fileId,
        name: driveAttachment.name,
        mimeType: driveAttachment.mimeType,
        webViewLink: driveAttachment.webViewLink || "",
        thumbnailLink: driveAttachment.thumbnailLink ?? null,
      });

      console.log("Drive attachment response:", {
        attachmentId: attachment?.id,
        taskId: attachment?.taskId,
        fileId: attachment?.fileId,
        source: attachment?.source,
      });

      setTask((prevTask) => {
        if (!prevTask || !attachment) return prevTask;
        const existingAttachments = (prevTask.attachments || []).filter(Boolean);
        const alreadyExists = existingAttachments.some((a) => a.id === attachment.id);
        const nextAttachments = alreadyExists
          ? existingAttachments
          : [...existingAttachments, attachment as NonNullable<typeof existingAttachments>[number]];
        return {
          ...prevTask,
          attachments: nextAttachments,
        };
      });

      toast({ title: "Success", description: `"${driveAttachment.name}" attached from Google Drive` });

      await queryClient.invalidateQueries({
        queryKey: ["task-details", id],
      });

      await queryClient.refetchQueries({
        queryKey: ["task-details", id],
        type: "active",
      });
    } catch (err: any) {
      toast({
        title: "Failed to attach Google Drive file",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveToGoogleDrive = async (attachment: { id: string; fileName: string; fileUrl: string; fileType?: string }) => {
    if (!attachment.fileUrl || !attachment.fileName) return;
    setSavingToDrive(attachment.id);
    try {
      const resolvedUrl = attachment.fileUrl.startsWith("http")
        ? attachment.fileUrl
        : `${API_BASE_URL}${attachment.fileUrl}`;

      const authToken = localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const resp = await fetch(resolvedUrl, { headers });
      if (!resp.ok) throw new Error("Could not fetch file for upload");
      const blob = await resp.blob();
      const file = new File([blob], attachment.fileName, {
        type: attachment.fileType || blob.type || "application/octet-stream",
      });

      uploadToGoogleDrive({ file, fileName: attachment.fileName });
    } catch (err: any) {
      toast({
        title: "Failed to save to Google Drive",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
      setSavingToDrive(null);
    }
  };

  const handleSendComment = async (overrideContent?: string) => {
    const content = (overrideContent || newComment).trim();
    if (!id || !content || sendingComment || isReadOnly) return;
    
    // messageId will be determined by WebSocket send (preferred) or local fallback
    let messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      setSendingComment(true);
      
      // Create optimistic comment with correct profile picture field
      const optimisticComment: CorrectedTaskComment = {
        id: `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        taskId: id,
        userId: user?.id || '',
        content: content,
        isSystemMessage: false,
        metadata: {
          messageId: messageId,
          isOptimistic: true,
          sending: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: {
          id: user?.id || '',
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
          role: user?.role || 'team_member',
          profilePictureUrl: user?.profilePictureUrl // Handle both fields
        }
      };
      
      // Add optimistic comment immediately
      setComments(prev => [...prev, optimisticComment]);
      scrollToBottom();
      
      // Store as pending
      setPendingComments(prev => new Map([
        ...prev, 
        [messageId, { content, timestamp: Date.now() }]
      ]));
      
      // Store in ref for quick access
      optimisticCommentRef.current.set(messageId, optimisticComment);
      
      // Try WebSocket first if connected
      if (isConnected) {
        try {
          // Ensure we are in the room; backend also auto-joins, but this keeps UX consistent
          joinTaskRoom(id);
          // Send via WebSocket with messageId
          const wsMsgId = sendComment(id, content);
          if (wsMsgId) {
            // Align optimistic messageId with the one the server will echo back
            if (wsMsgId !== messageId) {
              // Update maps to use wsMsgId
              setPendingComments(prev => {
                const next = new Map(prev);
                const pending = next.get(messageId);
                if (pending) {
                  next.delete(messageId);
                  next.set(wsMsgId, pending);
                }
                return next;
              });
              const optimistic = optimisticCommentRef.current.get(messageId);
              if (optimistic) {
                optimistic.metadata = { ...optimistic.metadata, messageId: wsMsgId };
                optimisticCommentRef.current.delete(messageId);
                optimisticCommentRef.current.set(wsMsgId, optimistic);
              }
              messageId = wsMsgId;
            }
          }
          console.log('Comment sent via WebSocket with messageId:', messageId);
        } catch (wsError) {
          console.error('WebSocket send failed, falling back to HTTP:', wsError);
          // Fallback to HTTP
          await sendCommentViaHttp(content, messageId);
        }
      } else {
        // WebSocket not connected, use HTTP
        await sendCommentViaHttp(content, messageId);
      }
      
      setNewComment("");
      
      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isConnected) {
        sendTypingIndicator(id, false);
      }
      
    } catch (error: any) {
      console.error('Error sending comment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send comment",
        variant: "destructive",
      });
      
      // Remove optimistic comment on error
      removeOptimisticComment(messageId);
    } finally {
      setSendingComment(false);
    }
  };

  // Helper function to send comment via HTTP API
  const sendCommentViaHttp = async (content: string, messageId: string) => {
    try {
      const response = await api.addTaskComment(id!, content);
      
      // Fix the profile picture in the response
      const fixedComment = fixCommentProfilePicture(response.comment);
      
      // Remove optimistic comment
      removeOptimisticComment(messageId);
      
      // Add real comment
      setComments(prev => [...prev, fixedComment]);
      
      scrollToBottom();
    } catch (error: any) {
      throw error;
    }
  };

  // Helper function to remove optimistic comment
  const removeOptimisticComment = (messageId: string) => {
    setComments(prev => prev.filter(comment => 
      !comment.id.startsWith('optimistic-') || 
      comment.metadata?.messageId !== messageId
    ));
    
    setPendingComments(prev => {
      const newMap = new Map(prev);
      newMap.delete(messageId);
      return newMap;
    });
    
    optimisticCommentRef.current.delete(messageId);
  };

  const handleTyping = useCallback(() => {
    if (!id || !isConnected) return;

    // Send typing indicator
    sendTypingIndicator(id, true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(id, false);
    }, 2000);
  }, [id, isConnected, sendTypingIndicator]);

  const scrollToBottom = () => {
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const STATUS_LABEL = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const PRIORITY_COLORS = {
    low: "bg-blue-100 text-blue-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const renderDeliveryMark = (comment: CorrectedTaskComment) => {
    if (comment.userId !== user?.id) return null;
    const isOptimistic = comment.id.startsWith("optimistic-");
    return (
      <span className="ml-2 inline-flex items-center opacity-70">
        {isOptimistic ? (
          <Check className="w-3 h-3" />
        ) : (
          <CheckCheck className="w-3 h-3" />
        )}
      </span>
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Parse "📎 Uploaded N file(s): a.png, b.pdf" -> ["a.png", "b.pdf"]
  const parseUploadedFilenames = (content: string): string[] => {
    if (!content || !content.includes("📎 Uploaded")) return [];
    const idx = content.indexOf(":");
    if (idx < 0) return [];
    return content
      .slice(idx + 1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const findAttachmentByName = (name: string) => {
    return task?.attachments?.find((a) => 
      a.fileName === name || (a as any).name === name
    );
  };

  // Re-upload a file (from a URL) into task attachments. Used for chat files not already in docs.
  const handleAddToTaskDocsFromUrl = async (url: string, name: string, type: string) => {
    if (!id) return;
    try {
      setAddingToDocs(true);
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], name, { type: type || blob.type });
      const response = await api.uploadTaskAttachments(id, [file]);
      setTask(response.data.task);
      toast({ title: "Added", description: `${name} added to Task Documents.` });
      setPreview((p) => (p ? { ...p, alreadyInDocs: true } : p));
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.message || "Could not add file to Task Documents",
        variant: "destructive",
      });
    } finally {
      setAddingToDocs(false);
    }
  };

  // NOTE: the legacy mobile-only chat sheet was replaced by the unified
  // responsive panel sheet at the bottom of this file, which reuses the same
  // Chat / Files / Activity / Edit content as desktop.



  // ============================================================
  // Workbench render helpers
  // ============================================================

  const DetailsPanelSkeleton = (
    <div className="flex h-full flex-col overflow-hidden bg-muted/20">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-8 w-3/4 mb-2" />
            <div className="flex gap-2 mb-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Metadata cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-lg border bg-card p-3">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Overview skeleton */}
        <section className="rounded-lg border bg-card p-4">
          <Skeleton className="h-5 w-32 mb-3" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-2/3" />
        </section>

        {/* Subtasks skeleton */}
        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-32" />
          </div>
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </section>

        {/* Watchers skeleton */}
        <section className="rounded-lg border bg-card p-4">
          <Skeleton className="h-5 w-24 mb-3" />
          <div className="flex gap-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-8 rounded-full" />)}
          </div>
        </section>
      </div>
    </div>
  );

  const CollaborationPanelSkeleton = (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b px-3 pt-2 shrink-0">
        <div className="flex gap-1 mb-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 flex-1 rounded-md" />)}
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const STATUS_PILLS: { value: string; label: string }[] = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "delayed", label: "Delayed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const priorityDot = (p?: string) => {
    const map: any = {
      urgent: "bg-red-500",
      high: "bg-orange-500",
      medium: "bg-yellow-500",
      low: "bg-blue-500",
    };
    return map[p || "medium"] || "bg-muted";
  };

  const daysLeft = (deadline?: string, status?: string) => {
    if (!deadline) return null;
    if (status === "completed") return { text: "Completed", tone: "text-green-600" };
    if (status === "cancelled") return { text: "Cancelled", tone: "text-muted-foreground" };
    const ms = new Date(deadline).getTime() - Date.now();
    const d = Math.ceil(ms / 86400000);
    if (d < 0) return { text: `${Math.abs(d)}d overdue`, tone: "text-destructive" };
    if (d === 0) return { text: "Due today", tone: "text-warning" };
    return { text: `${d} day${d === 1 ? "" : "s"} left`, tone: "text-warning" };
  };

  const TaskListPanel = (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="p-3 sm:p-4 border-b space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">Task Workbench</h2>
          <div className="flex items-center gap-1 shrink-0">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" onClick={() => setShowCreateTask(true)} className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New task</TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="icon" onClick={() => listQuery.refetch()} className="h-8 w-8">
                <RefreshCw className={cn("h-4 w-4", listQuery.isFetching && "animate-spin")} />
              </Button>
              {!isMobile && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Collapse task list"
                      onClick={() => setListPanelOpen(false)}
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Collapse task list</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>

        </div>
        <div className="flex gap-2">
          <Button
            variant={listScope === "workspace" ? "default" : "ghost"}
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={() => { setListScope("workspace"); setListPage(1); }}
          >
            Active Workspace
          </Button>
          <Button
            variant={listScope === "all_workspaces" ? "default" : "ghost"}
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={() => { setListScope("all_workspaces"); setListPage(1); }}
          >
            All My Tasks
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={leftSearchRef}
            value={listSearch}
            onChange={(e) => {
              setListSearch(e.target.value);
              setListPage(1);
            }}
            placeholder="Search tasks…  ( / or ⌘K )"
            className="pl-9 h-9"
          />
        </div>
        <Select value={listStatus} onValueChange={(v) => { setListStatus(v); setListPage(1); }}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_PILLS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{listQuery.data?.pagination?.totalResults ?? sortedListTasks.length} tasks</span>
          <Select value={listSort} onValueChange={(v: any) => setListSort(v)}>
            <SelectTrigger className="h-7 w-[130px] text-xs border-none shadow-none px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due">Sort: Due Date</SelectItem>
              <SelectItem value="created">Sort: Created</SelectItem>
              <SelectItem value="priority">Sort: Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {listQuery.isLoading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
        ) : sortedListTasks.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No tasks found.</div>
        ) : (
          sortedListTasks.map((t: any) => {
            const isSelected = t.id === task?.id;
            const dl = daysLeft(t.deadline, t.status);
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/task-details/${t.id}`)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition-all group",
                  "hover:border-primary/50 hover:shadow-sm",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border bg-card"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", priorityDot(t.priority))} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{t.title}</p>
                    {t.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <Badge className={cn("text-[10px] px-1.5 py-0", STATUS_COLORS[t.status as keyof typeof STATUS_COLORS])}>
                        {STATUS_LABEL[t.status as keyof typeof STATUS_LABEL] || t.status}
                      </Badge>
                      {t.deadline && (
                        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(t.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                      {t.assignee && (
                        <Avatar className="h-4 w-4 ml-auto">
                          <AvatarImage src={(t.assignee as any)?.profilePictureUrl} />
                          <AvatarFallback className="text-[8px]">
                            {getInitials(t.assignee?.firstName || '', t.assignee?.lastName || '')}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    {dl && isSelected && (
                      <p className={cn("text-[10px] mt-1 font-medium", dl.tone)}>{dl.text}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {listQuery.data?.pagination && listQuery.data.pagination.totalPages > 1 && (
        <div className="p-2 border-t flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Page {listQuery.data.pagination.currentPage} / {listQuery.data.pagination.totalPages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7"
              disabled={!listQuery.data.pagination.hasPrevPage}
              onClick={() => setListPage((p) => Math.max(1, p - 1))}>
              <ChevronRight className="h-3 w-3 rotate-180" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7"
              disabled={!listQuery.data.pagination.hasNextPage}
              onClick={() => setListPage((p) => p + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const getErrorState = () => {
    if (!taskQuery.isError) return null;
    const error = taskQuery.error as any;
    if (error?.name === 'NetworkError') {
      return {
        title: "You're offline",
        description: "Check your connection and try again.",
        icon: AlertCircle,
        tone: "text-muted-foreground"
      };
    }
    if (error?.status === 403) {
      return {
        title: "You don't have permission to view this task",
        description: "You can still browse other tasks in the list.",
        icon: AlertCircle,
        tone: "text-yellow-600"
      };
    }
    if (error?.status === 404) {
      return {
        title: "Task not found",
        description: "This task may have been deleted or you don't have access.",
        icon: AlertCircle,
        tone: "text-muted-foreground"
      };
    }
    return {
      title: "Something went wrong",
      description: "Please try again later.",
      icon: AlertCircle,
      tone: "text-red-600"
    };
  };

  const ErrorStatePanel = () => {
    const state = getErrorState();
    if (!state) return null;
    const Icon = state.icon;
    return (
      <div className="flex h-full flex-col items-center justify-center bg-muted/20 p-6 text-center">
        <Icon className={cn("h-12 w-12 mb-4", state.tone)} />
        <h3 className="text-lg font-semibold mb-2">{state.title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{state.description}</p>
        <Button variant="outline" onClick={() => taskQuery.refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  };

  const DetailsPanel = taskQuery.isLoading ? DetailsPanelSkeleton :
    taskQuery.isError ? <ErrorStatePanel /> :
    task ? (() => {
      const dl = daysLeft(task.deadline, task.status);
      const subtaskCount = getTaskSubtaskCount(task);
      const completedSub = (task.subtasks || []).filter(Boolean).filter((s: any) => s.status === "completed" || s.completed).length;
      const progressPct = subtaskCount > 0 ? Math.round((completedSub / subtaskCount) * 100) : 0;
      const canEditSubtasks =
        user?.role === "admin" ||
        user?.id === task.assigneeId ||
        user?.id === task.creator?.id ||
        user?.role === "executive" ||
        user?.role === "manager";
      const canCreateSubtasksByPolicy =
        user?.role === "manager" || user?.role === "admin"
          ? canPerformRoleOperation("create_tasks", user?.role)
          : true;

      return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/20">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-3 py-3 sm:px-5 sm:py-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1 basis-full xl:basis-[52%]">
                <div className="flex items-start gap-2">
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 -ml-1.5 shrink-0"
                      aria-label="Back to task list"
                      onClick={() => setMobilePanel("list")}
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </Button>
                  )}
                  <div className="min-w-0 flex-1">
                    <h1 className="text-base sm:text-xl xl:text-2xl font-bold leading-snug break-words">
                      {task.title || "Untitled Task"}
                    </h1>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <Badge className={cn("text-[10px] sm:text-xs", STATUS_COLORS[task.status])}>{STATUS_LABEL[task.status as keyof typeof STATUS_LABEL] || task.status}</Badge>
                      <Badge className={cn("text-[10px] sm:text-xs", PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS])}>{task.priority}</Badge>
                      {isReadOnly && (
                        <Badge
                          variant="outline"
                          className="text-[10px] sm:text-xs gap-1 text-muted-foreground border-border bg-muted/40"
                          title="You can view this task but not modify it"
                        >
                          <Lock className="h-3 w-3" /> Read only
                        </Badge>
                      )}
                      <button className="text-muted-foreground hover:text-yellow-500 transition">
                        <Star className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{task.description}</p>
                )}
              </div>

              <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

              {/* Desktop / tablet toolbar */}
              <div className="hidden md:flex items-center gap-2 shrink-0">
                <TooltipProvider delayDuration={150}>
                  <div className="hidden lg:flex items-center gap-1.5 pr-1 border-r mr-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</span>
                    <Select value={task.status || "pending"} onValueChange={handleStatusChange} disabled={updating || isReadOnly}>
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="delayed">Delayed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => taskQuery.refetch()} className="h-8 w-8 xl:hidden">
                        <RefreshCw className={cn("h-3.5 w-3.5", taskQuery.isFetching && "animate-spin")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reload task</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => taskQuery.refetch()} className="gap-1.5 hidden xl:inline-flex">
                        <RefreshCw className={cn("h-3.5 w-3.5", taskQuery.isFetching && "animate-spin")} /> Refresh
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reload task from server</TooltipContent>
                  </Tooltip>

                  {!isReadOnly && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="secondary" onClick={() => setShowCreateTask(true)} className="gap-1.5">
                          <Plus className="h-3.5 w-3.5" /> <span className="hidden xl:inline">New Task</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Create a new task</TooltipContent>
                    </Tooltip>
                  )}

                  {!isReadOnly && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingFiles} className="gap-1.5">
                          <Upload className="h-3.5 w-3.5" /> <span className="hidden xl:inline">Upload File</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Attach files to this task</TooltipContent>
                    </Tooltip>
                  )}

                  {!isReadOnly && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (isTablet) {
                              setRightTab("edit");
                              setCollabSheetOpen(true);
                            } else {
                              setCollabPanelOpen(true);
                              setRightTab("edit");
                            }
                          }}
                          className="gap-1.5"
                        >
                          <Pencil className="h-3.5 w-3.5" /> <span className="hidden xl:inline">Edit</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open the full task editor</TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Close</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Mobile toolbar — status is the primary action */}
              <div className="flex md:hidden items-center gap-2 w-full">
                <Select value={task.status || "pending"} onValueChange={handleStatusChange} disabled={updating || isReadOnly}>
                  <SelectTrigger className="h-9 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    aria-label="Upload file"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFiles || isReadOnly}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  aria-label="Refresh task"
                  onClick={() => taskQuery.refetch()}
                >
                  <RefreshCw className={cn("h-4 w-4", taskQuery.isFetching && "animate-spin")} />
                </Button>
                {!isReadOnly && (
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    aria-label="New task"
                    onClick={() => setShowCreateTask(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 space-y-4 sm:space-y-5">

            {/* Metadata cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Deadline
                </div>
                <p className="font-semibold text-sm mt-1">{task.deadline ? new Date(task.deadline).toLocaleDateString() : "—"}</p>
                {task.calendarSynced ? (
                  <p className="text-[11px] mt-1 text-muted-foreground flex items-center gap-2">📅 Synced to Google Calendar</p>
                ) : null}
                {dl && <p className={cn("text-[11px] mt-0.5 font-medium", dl.tone)}>{dl.text}</p>}
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User2 className="h-3.5 w-3.5" /> Assignee
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {task.assignee ? (
                    <>
                      <Avatar className="h-6 w-6"><AvatarImage src={(task.assignee as any)?.profilePictureUrl} /><AvatarFallback className="text-[10px]">{getInitials(task.assignee?.firstName || '', task.assignee?.lastName || '')}</AvatarFallback></Avatar>
                      <p className="font-semibold text-sm truncate">{task.assignee?.firstName || ''} {task.assignee?.lastName || ''}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Unassigned</p>
                  )}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" /> Workspace
                </div>
                <p className="font-semibold text-sm mt-1 truncate">{task.company?.name || "—"}</p>
                {task.category && <p className="text-[11px] text-muted-foreground truncate">{task.category}</p>}
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Created
                </div>
                <p className="font-semibold text-sm mt-1">{(task as any).createdAt ? new Date((task as any).createdAt).toLocaleDateString() : "—"}</p>
                {task.creator && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    by {task.creator?.firstName || ''} {task.creator?.lastName || ''}
                  </p>
                )}
              </div>
            </div>

            {/* Overview with Expand/Collapse - ENHANCED */}
            <section className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <ListChecks className="h-4 w-4" /> Overview
              </h3>
              {task.description ? (
                <>
                  <div className="relative">
                    <p className={cn(
                      "text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed",
                      !showFullDescription && "line-clamp-3"
                    )}>
                      {task.description}
                    </p>
                    {task.description.length > 100 && (
                      <button
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                      >
                        {showFullDescription ? (
                          <>
                            See less <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            See more <ChevronDown size={14} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description provided.</p>
              )}
            </section>

            {/* Stats Cards - MOVED OUTSIDE Overview */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Subtasks</p>
                <p className="font-bold text-lg">{completedSub}/{subtaskCount || 0}</p>
                <p className="text-[10px] text-muted-foreground">{progressPct}% completed</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Attachments</p>
                <p className="font-bold text-lg">{task.attachments?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground">Files</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Comments</p>
                <p className="font-bold text-lg">{comments.length}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Watchers</p>
                <p className="font-bold text-lg">{getTaskWatcherCount(task)}</p>
                <p className="text-[10px] text-muted-foreground">Following</p>
              </div>
            </section>

            {/* Subtasks - ENHANCED with scrollable list */}
            <section className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ListChecks className="h-4 w-4" /> Subtasks
                  <span className="text-xs text-muted-foreground font-normal">{completedSub} of {subtaskCount} completed</span>
                </h3>
                <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              {!canCreateSubtasksByPolicy && (
                <p className="text-xs text-muted-foreground mb-2">Subtask creation is disabled by workspace policy.</p>
              )}
              <SubtaskList
                taskId={task.id}
                initialSubtasks={(task.subtasks || []).filter(Boolean)}
                canEdit={canEditSubtasks && canCreateSubtasksByPolicy && !isReadOnly}
                onChanged={(next) => setTask((prev) => (prev ? { ...prev, subtasks: next } : prev))}
              />
            </section>

            {/* Watchers */}
            <section className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-2">Watchers</h3>
              <TaskWatcherSection
                taskId={task.id}
                initialWatcherCount={task.watcherCount || 0}
                initialIsWatching={!!task.isWatching}
                initialRecentWatchers={(task.recentWatchers || []).filter(Boolean)}
                onChanged={(next) =>
                  setTask((prev) => prev ? { ...prev, watcherCount: next.watcherCount, isWatching: next.isWatching, recentWatchers: next.recentWatchers } : prev)
                }
              />
            </section>

            {/* Status update — hidden entirely in read-only mode */}
            {!isReadOnly && (user?.id === task.assigneeId ||
              (task as any).assignees?.filter(Boolean).some((a: any) => a.id === user?.id) ||
              user?.id === task.creator?.id ||
              ["manager", "executive", "admin", "team_member"].includes(user?.role || "")) && (
              <section className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-2">Update Status</p>
                <Select value={task.status || "pending"} onValueChange={handleStatusChange} disabled={updating}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </section>
            )}
          </div>
        </div>
      );
    })() : DetailsPanelSkeleton;

  const ChatContent = (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {commentsQuery.isFetching ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-16 w-full" /></div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-2 opacity-40" />
            <p>No comments yet</p>
            <p className="text-sm">Start the conversation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className={cn("flex gap-3", comment.userId === user?.id && "flex-row-reverse")}>
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={comment.user?.profilePictureUrl} />
                  <AvatarFallback className="text-xs">{getInitials(comment.user?.firstName || '', comment.user?.lastName || '')}</AvatarFallback>
                </Avatar>
                <div className={cn("max-w-[80%]", comment.userId === user?.id && "text-right")}>
                  <div className={cn("flex items-center gap-2 mb-1", comment.userId === user?.id && "justify-end")}>
                    <span className="text-xs font-medium">
                      {comment.isSystemMessage ? (
                        <span className="flex items-center gap-1 text-muted-foreground"><AlertCircle className="w-3 h-3" />System</span>
                      ) : (
                        `${comment.user?.firstName} ${comment.user?.lastName}`
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatTime(comment.createdAt)}</span>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg text-left",
                    comment.isSystemMessage
                      ? "bg-muted/50 border"
                      : comment.userId === user?.id
                        ? comment.id.startsWith('optimistic-') ? "bg-primary/70 text-primary-foreground" : "bg-primary text-primary-foreground"
                        : "bg-muted"
                  )}>
                    <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                    {comment.content.includes("📎 Uploaded") && (() => {
                      const names = parseUploadedFilenames(comment.content);
                      const matched = names.map((n) => findAttachmentByName(n)).filter(Boolean) as NonNullable<Task["attachments"]>;
                      if (matched.length === 0) return null;
                      return (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {matched.map((f) => {
                            const fAny = f as any;
                            const displayName =
                              f.fileName || fAny.name || "";
                            const displayUrl =
                              fAny.webViewLink ||
                              fAny.externalUrl ||
                              f.fileUrl ||
                              "";
                            const displayType =
                              fAny.mimeType ||
                              f.fileType ||
                              "";
                            const isDrive = fAny.source === "google-drive";
                            return (
                              <FilePreviewCard
                                key={f.id}
                                compact
                                className={comment.userId === user?.id ? "bg-primary-foreground/10 border-primary-foreground/20 text-foreground" : ""}
                                file={{
                                  id: f.id,
                                  name: displayName,
                                  url: displayUrl,
                                  type: displayType,
                                  source: fAny.source,
                                  thumbnailLink: fAny.thumbnailLink || fAny.thumbnailUrl,
                                  webViewLink: fAny.webViewLink,
                                }}
                                onClick={() => {
                                  if (isDrive && displayUrl) {
                                    window.open(displayUrl, "_blank", "noopener,noreferrer");
                                  } else if (f.fileUrl) {
                                    setPreview({ url: f.fileUrl, type: displayType, name: displayName, attachmentId: f.id, alreadyInDocs: true });
                                  } else if (displayUrl) {
                                    window.open(displayUrl, "_blank", "noopener,noreferrer");
                                  }
                                }}
                                actions={
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-6 px-2 text-[10px] gap-1"
                                    disabled
                                    title="Already in task documents"
                                  >
                                    <Check className="w-3 h-3" /> In Files
                                  </Button>
                                }
                              />
                            );
                          })}
                        </div>
                      );
                    })()}
                    {renderDeliveryMark(comment)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
        )}
      </div>
      <div className="p-3 border-t bg-background">
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder={isReadOnly ? "You can't comment on read-only tasks" : "Type a message..."}
            rows={2}
            value={newComment}
            onChange={(e) => { setNewComment(e.target.value); handleTyping(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
            className="flex-1 resize-none text-sm"
            disabled={sendingComment || isReadOnly}
          />
          <div className="flex flex-col gap-1.5">
            <input type="file" multiple ref={chatFileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, true)} />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => chatFileInputRef.current?.click()} disabled={uploadingFiles || isReadOnly}>
              <Paperclip className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" className="h-8 w-8" onClick={() => handleSendComment()} disabled={!newComment.trim() || sendingComment || isReadOnly}>
              {sendingComment ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
        <div className="mt-1.5 text-[11px] text-muted-foreground flex justify-between">
          <span>Enter to send · Shift+Enter for new line</span>
          {!isConnected && <span className="text-yellow-600">Offline · HTTP fallback</span>}
        </div>
      </div>
    </div>
  );

  const FilesContent = task ? (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilesIcon className="h-4 w-4" />
            <h3 className="font-semibold text-sm">Attachments</h3>
            <Badge variant="outline" className="text-[10px]">{task.attachments?.length || 0}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs justify-center"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFiles}
          >
            {uploadingFiles ? <Clock className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Upload from Device
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs justify-center border-[#4285F4]/30 hover:bg-[#4285F4]/10 hover:text-[#4285F4]"
            onClick={() => setShowDrivePicker(true)}
            disabled={uploadingFiles}
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#4285F4] fill-current" aria-hidden>
              <path d="M7.71 3.5h8.58l3.71 6.43H4L7.71 3.5zM3.5 10l3.71 6.43L7.43 20.5h-.72L2.79 11.5l.71-1.5zM20.5 10l.71.5-3.92 9h-.72l-.21-4.07L20.5 10zM3.71 10.5h13.29l-3.29 7.62h-6.72L3.71 10.5z" />
            </svg>
            Choose from Google Drive
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {task.attachments?.filter(Boolean).length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {task.attachments.filter(Boolean).map((file) => {
              const isOwner = !isReadOnly && (user?.role === "admin" || user?.role === "manager" || user?.id === task.creator?.id);
              const attachmentFile = file as any;
              const isGoogleDrive =
                attachmentFile.source === "google-drive";
              const attachmentUrl =
                attachmentFile.webViewLink ||
                attachmentFile.externalUrl ||
                attachmentFile.fileUrl ||
                "";
              const thumbnail =
                attachmentFile.thumbnailLink ||
                attachmentFile.thumbnailUrl;
              const mimeType =
                attachmentFile.mimeType ||
                attachmentFile.fileType ||
                "";
              const fileName =
                attachmentFile.fileName ||
                attachmentFile.name ||
                "";
              const currentlySaving = savingToDrive === file?.id;

              return (
                <div key={file?.id} className="space-y-1.5">
                  <FilePreviewCard
                    file={{
                      id: file?.id,
                      name: fileName,
                      url: attachmentUrl,
                      type: mimeType,
                      source: attachmentFile.source,
                      thumbnailLink: thumbnail,
                      webViewLink: attachmentFile.webViewLink,
                    }}
                    onClick={() => {
                      if (isGoogleDrive && attachmentUrl) {
                        window.open(attachmentUrl, "_blank", "noopener,noreferrer");
                      } else if (attachmentFile.fileUrl) {
                        setPreview({ url: attachmentFile.fileUrl, type: mimeType, name: fileName, attachmentId: file?.id, alreadyInDocs: true });
                      } else if (attachmentUrl) {
                        window.open(attachmentUrl, "_blank", "noopener,noreferrer");
                      }
                    }}
                    actions={
                      <>
                        {!isGoogleDrive && (
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6"
                            asChild
                            title="Open"
                          >
                            <a href={attachmentFile.fileUrl} download={fileName}><Download className="w-3 h-3" /></a>
                          </Button>
                        )}
                        {isGoogleDrive && attachmentUrl && (
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6"
                            asChild
                            title="Open in Drive"
                          >
                            <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </Button>
                        )}
                        {isOwner && (
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => handleDeleteAttachment(file?.id, fileName)}
                            title="Remove"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </>
                    }
                  />
                  <div className="flex flex-col gap-1">
                    {isGoogleDrive ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] flex-1 gap-1 justify-center border-[#4285F4]/30 hover:bg-[#4285F4]/10 hover:text-[#4285F4]"
                          asChild
                          disabled={!attachmentUrl}
                        >
                          <a href={attachmentUrl || "#"} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" /> Open in Drive
                          </a>
                        </Button>
                        {isOwner && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] flex-1 gap-1 justify-center text-destructive hover:text-destructive"
                            onClick={() => handleDeleteAttachment(file?.id, fileName)}
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] flex-1 gap-1 justify-center"
                          onClick={() => attachmentFile.fileUrl && setPreview({ url: attachmentFile.fileUrl, type: mimeType, name: fileName, attachmentId: file?.id, alreadyInDocs: true })}
                          disabled={!attachmentFile.fileUrl}
                        >
                          <Eye className="w-3 h-3" /> Open
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] flex-1 gap-1 justify-center border-[#4285F4]/30 hover:bg-[#4285F4]/10 hover:text-[#4285F4]"
                          onClick={() => handleSaveToGoogleDrive({
                            id: file?.id || "",
                            fileName: fileName || "",
                            fileUrl: attachmentFile.fileUrl || "",
                            fileType: mimeType,
                          })}
                          disabled={currentlySaving || uploadLoading || !attachmentFile.fileUrl}
                        >
                          {currentlySaving || (uploadLoading && savingToDrive === file?.id) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#4285F4] fill-current" aria-hidden>
                              <path d="M7.71 3.5h8.58l3.71 6.43H4L7.71 3.5zM3.71 10.5h13.29l-3.29 7.62h-6.72L3.71 10.5z" />
                            </svg>
                          )}
                          Save to Google Drive
                        </Button>
                        {isOwner && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] w-7 shrink-0 justify-center text-destructive hover:text-destructive"
                            onClick={() => handleDeleteAttachment(file?.id, fileName)}
                            title="Remove"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
            <FileText className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No files attached yet</p>
            {!isReadOnly && (
              <div className="flex gap-2 mt-2">
                <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => fileInputRef.current?.click()}>Upload from device</Button>
                <span className="text-xs opacity-40">or</span>
                <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setShowDrivePicker(true)}>Choose from Google Drive</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null;

  const ActivityContent = task ? (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b shrink-0 flex items-center gap-2">
        <ActivityIcon className="h-4 w-4" />
        <h3 className="font-semibold text-sm">Activity</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <TaskActivityTimeline taskId={task?.id} initialActivities={(task.activities || []).filter(Boolean)} />
      </div>
    </div>
  ) : null;

  const EditContent = task ? (
    <div className="h-full overflow-hidden animate-fade-in">
      <TaskEditDrawer
        inline
        taskId={task?.id}
        onTaskUpdated={(updated) => setTask(updated)}
        onTaskDeleted={() => navigate("/tasks/all")}
      />
    </div>
  ) : null;

  const CollaborationPanel = taskQuery.isLoading ? CollaborationPanelSkeleton :
    taskQuery.isError ? (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm text-center p-4">
        {(taskQuery.error as any)?.status === 403 
          ? "You don't have permission to view this task." 
          : "Failed to load task details. Please try again."}
      </div>
    ) :
    task ? (
    <div className="flex h-full flex-col bg-background">
      <Tabs value={rightTab} onValueChange={(v: any) => setRightTab(v)} className="flex h-full flex-col">
        <div className="border-b px-3 pt-2 shrink-0">
          <TooltipProvider delayDuration={150}>
            <TabsList className="w-full bg-transparent p-0 h-auto gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="chat" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md gap-1.5 transition-all">
                    <MessageSquare className="h-3.5 w-3.5" /> Chat
                    {comments.length > 0 && <Badge variant="outline" className="text-[10px] ml-1 h-4 px-1">{comments.length}</Badge>}
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>Chat — press 1</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="files" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md gap-1.5 transition-all">
                    <FilesIcon className="h-3.5 w-3.5" /> Files
                    {(task.attachments?.length || 0) > 0 && <Badge variant="outline" className="text-[10px] ml-1 h-4 px-1">{task.attachments!.length}</Badge>}
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>Files — press 2</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="activity" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md gap-1.5 transition-all">
                    <ActivityIcon className="h-3.5 w-3.5" /> Activity
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>Activity — press 3</TooltipContent>
              </Tooltip>
              {!isReadOnly && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="edit" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md gap-1.5 transition-all">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Edit — press 4</TooltipContent>
                </Tooltip>
              )}
            </TabsList>
          </TooltipProvider>
        </div>
        <TabsContent value="chat" className="flex-1 m-0 overflow-hidden data-[state=inactive]:hidden">{ChatContent}</TabsContent>
        <TabsContent value="files" className="flex-1 m-0 overflow-hidden data-[state=inactive]:hidden">{FilesContent}</TabsContent>
        <TabsContent value="activity" className="flex-1 m-0 overflow-hidden data-[state=inactive]:hidden">{ActivityContent}</TabsContent>
        <TabsContent value="edit" className="flex-1 m-0 overflow-hidden data-[state=inactive]:hidden">{EditContent}</TabsContent>
      </Tabs>
    </div>
  ) : <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Select a task to view details</div>;

  return (
    <>
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        onSuccess={() => {
          setShowCreateTask(false);
          listQuery.refetch();
        }}
      />

      {preview && (
        <AttachmentPreview
          url={preview.url}
          type={preview.type}
          name={preview.name}
          onClose={() => setPreview(null)}
          alreadyInTaskDocs={preview.alreadyInDocs}
          addingToTaskDocs={addingToDocs}
          onAddToTaskDocs={
            preview.alreadyInDocs
              ? undefined
              : () => handleAddToTaskDocsFromUrl(preview.url, preview.name, preview.type)
          }
        />
      )}
      

      <AlertDialog
        open={!!attachmentToDelete}
        onOpenChange={(o) => !o && setAttachmentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              {attachmentToDelete?.name
                ? `"${attachmentToDelete.name}" will be permanently removed from this task.`
                : "This attachment will be permanently removed from this task."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAttachment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GoogleDrivePickerDialog
        open={showDrivePicker}
        onOpenChange={setShowDrivePicker}
        onSelect={handleAttachGoogleDriveFile}
      />


      {/* Unified responsive panel sheet (mobile) */}
      <Sheet open={!!mobilePanel} onOpenChange={(o) => !o && setMobilePanel(null)}>
        <SheetContent
          side="bottom"
          className="h-[92dvh] p-0 gap-0 flex flex-col rounded-t-2xl"
        >
          <SheetHeader className="shrink-0 border-b px-2 py-2.5 text-left">
            <SheetTitle className="flex items-center gap-1.5 text-base">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Back"
                onClick={() => setMobilePanel(null)}
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </Button>
              {mobilePanel === "list" && <><ListChecks className="h-4 w-4" /> Tasks</>}
              {mobilePanel === "chat" && <><MessageSquare className="h-4 w-4" /> Chat</>}
              {mobilePanel === "files" && <><FilesIcon className="h-4 w-4" /> Files</>}
              {mobilePanel === "activity" && <><ActivityIcon className="h-4 w-4" /> Activity</>}
              {mobilePanel === "edit" && <><Pencil className="h-4 w-4" /> Edit Task</>}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden pb-[env(safe-area-inset-bottom)]">
            {mobilePanel === "list" && TaskListPanel}
            {mobilePanel === "chat" && ChatContent}
            {mobilePanel === "files" && FilesContent}
            {mobilePanel === "activity" && ActivityContent}
            {mobilePanel === "edit" && EditContent}
          </div>
        </SheetContent>
      </Sheet>

      {/* Collaboration sheet (tablet) */}
      <Sheet open={collabSheetOpen} onOpenChange={setCollabSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[460px] p-0 gap-0 flex flex-col">
          <SheetHeader className="shrink-0 border-b px-4 py-3 text-left">
            <SheetTitle className="text-base">Collaboration</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden">{CollaborationPanel}</div>
        </SheetContent>
      </Sheet>

      <DashboardLayout hidePadding>
        {isMobile ? (
          <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">{DetailsPanel}</div>

            {/* Bottom action bar — respects browser safe area */}
            <nav className="shrink-0 border-t bg-background/95 backdrop-blur px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
              <div className={cn("grid gap-0.5", isReadOnly ? "grid-cols-4" : "grid-cols-5")}>
                {([
                  { key: "list", label: "Tasks", Icon: ListChecks, count: 0 },
                  { key: "chat", label: "Chat", Icon: MessageSquare, count: comments.length },
                  { key: "files", label: "Files", Icon: FilesIcon, count: task?.attachments?.length || 0 },
                  { key: "activity", label: "Activity", Icon: ActivityIcon, count: 0 },
                  { key: "edit", label: "Edit", Icon: Pencil, count: 0 },
                ] as const)
                  .filter(({ key }) => !(isReadOnly && key === "edit"))
                  .map(({ key, label, Icon, count }) => (
                  <button
                    key={key}
                    onClick={() => setMobilePanel(key as any)}
                    className={cn(
                      "relative flex flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-medium transition-colors active:scale-[0.97]",
                      mobilePanel === key ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {label}
                    {count > 0 && (
                      <span className="absolute top-1 right-1.5 min-w-[14px] rounded-full bg-primary px-1 text-[9px] leading-[14px] text-primary-foreground">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </nav>
          </div>
        ) : (
          <div className="flex h-[calc(100dvh-3.5rem)] relative">
            {/* Collapsed task-list rail */}
            {!listPanelOpen && (
              <div className="w-11 shrink-0 border-r bg-background flex flex-col items-center gap-2 py-3">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setListPanelOpen(true)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Show task list</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" className="h-8 w-8" onClick={() => setShowCreateTask(true)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">New task</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground [writing-mode:vertical-rl]">
                  Tasks
                </span>
              </div>
            )}

            <ResizablePanelGroup direction="horizontal" className="h-full flex-1">
              {listPanelOpen && (
                <>
                  <ResizablePanel id="list" order={1} defaultSize={22} minSize={16} maxSize={34}>
                    {TaskListPanel}
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              )}
              <ResizablePanel id="details" order={2} defaultSize={collabPanelOpen && !isTablet ? 50 : 78} minSize={30}>
                {DetailsPanel}
              </ResizablePanel>
              {!isTablet && collabPanelOpen && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel id="collab" order={3} defaultSize={28} minSize={22} maxSize={45}>
                    {CollaborationPanel}
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>

            {/* Floating collaboration panel toggle at right edge */}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (isTablet) setCollabSheetOpen(true);
                      else setCollabPanelOpen(!collabPanelOpen);
                    }}
                    className={cn(
                      "absolute right-0 top-1/2 -translate-y-1/2 z-20 h-14 w-7 shadow-lg transition-all duration-200",
                      "bg-background hover:bg-primary hover:text-primary-foreground",
                      "rounded-r-none rounded-l-lg border-r-0"
                    )}
                  >
                    {!isTablet && collabPanelOpen ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronLeftIcon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {isTablet
                    ? "Open chat, files & editing"
                    : collabPanelOpen
                      ? "Hide collaboration panel"
                      : "Show collaboration panel"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </DashboardLayout>

    </>
  );
};

export default TaskDetails;
