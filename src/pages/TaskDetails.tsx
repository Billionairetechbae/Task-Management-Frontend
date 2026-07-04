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

import { X, Send, Clock, User2, MessageSquare, User, Clock4, AlertCircle, MessageCircle, ChevronRight, Check, CheckCheck, Paperclip, Upload, Trash2, FileText, Download, Search, Star, RefreshCw, Calendar, Building2, MoreHorizontal, ListChecks, Activity as ActivityIcon, Files as FilesIcon, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TaskEditDrawer from "@/components/dashboard/TaskEditDrawer";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, Task, TaskComment } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useIsMobile } from "@/hooks/use-mobile";

import CompanyBadge from "@/components/CompanyBadge";
import AttachmentPreview from "@/components/AttachmentPreview";
import FilePreviewCard from "@/components/tasks/FilePreviewCard";
import SubtaskList from "@/components/tasks/SubtaskList";
import TaskActivityTimeline from "@/components/tasks/TaskActivityTimeline";
import TaskWatcherSection from "@/components/tasks/TaskWatcherSection";
import { getTaskSubtaskCount, getTaskWatcherCount } from "@/lib/taskListUtils";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";


// Define the correct User type based on your database schema
interface CorrectedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  profilePictureUrl?: string; // Changed from profilePicture to profilePictureUrl
}

interface CorrectedTaskComment extends Omit<TaskComment, 'user'> {
  user: CorrectedUser;
}

const TaskDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canPerformRoleOperation } = useWorkspaceSettings();
  const { toast } = useToast();
  const { isConnected, joinTaskRoom, leaveTaskRoom, sendComment, sendTypingIndicator, on, off } = useWebSocket();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<CorrectedTaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
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

  // Workbench state
  const isMobile = useIsMobile();
  const [rightTab, setRightTab] = useState<"chat" | "files" | "activity" | "edit">("chat");
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState<string>("all");
  const [listPage, setListPage] = useState(1);
  const [listSort, setListSort] = useState<"due" | "created" | "priority">("due");
  const [mobileSection, setMobileSection] = useState<"list" | "details" | "chat">("details");

  const listQuery = useQuery({
    queryKey: ["task-workbench-list", { listSearch, listStatus, listPage }],
    queryFn: () =>
      api.getAllTasksCrossWorkspace({
        page: listPage,
        limit: 25,
        search: listSearch || undefined,
        status: listStatus === "all" ? undefined : listStatus,
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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optimisticCommentRef = useRef<Map<string, any>>(new Map());

  // Fetch task and comments
  useEffect(() => {
    fetchTask();
    fetchComments();
  }, [id]);

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
    if (!comment.user) return comment;
    
    return {
      ...comment,
      user: {
        ...comment.user,
        profilePictureUrl: comment.user.profilePicture || comment.user.profilePictureUrl || undefined
      }
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

  const fetchTask = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await api.getTaskById(id);
      setTask(response.data.task);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load task details",
        variant: "destructive",
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    try {
      setLoadingComments(true);
      const response = await api.getTaskComments(id, { limit: 50 });
      
      // Fix profile picture fields in fetched comments
      const fixedComments = response.comments.map(fixCommentProfilePicture);
      setComments(fixedComments);
      
      scrollToBottom();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setLoadingComments(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

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
      fetchTask();
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
    if (files.length === 0 || !id) return;

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

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this attachment?")) return;

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
    }
  };

  const handleSendComment = async (overrideContent?: string) => {
    const content = (overrideContent || newComment).trim();
    if (!id || !content || sendingComment) return;
    
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
    return task?.attachments?.find((a) => a.fileName === name);
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

  // Mobile chat toggle
  const renderMobileChatButton = () => (
    <Button
      onClick={() => setShowChatSheet(true)}
      className="w-full mt-4 sm:hidden flex items-center justify-center gap-2"
    >
      <MessageCircle className="w-4 h-4" />
      View Chat ({comments.length})
      <ChevronRight className="w-4 h-4" />
    </Button>
  );

  // Mobile chat sheet
  const renderMobileChatSheet = () => (
    <Sheet open={showChatSheet} onOpenChange={setShowChatSheet}>
      <SheetContent side="bottom" className="h-[95vh] sm:hidden">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Task Chat
            <span className="text-xs text-muted-foreground">
              {comments.length} messages
            </span>
          </SheetTitle>
        </SheetHeader>
        
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto py-4 h-[calc(90vh-120px)]">
          {loadingComments ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-2" />
              <p>No comments yet</p>
              <p className="text-sm">Start the conversation</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`flex gap-3 ${
                    comment.userId === user?.id ? 'flex-row-reverse' : ''
                  }`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.user?.profilePictureUrl} />
                    <AvatarFallback>
                      {getInitials(
                        comment.user?.firstName || '',
                        comment.user?.lastName || ''
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[70%] ${
                      comment.userId === user?.id ? 'text-right' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {comment.isSystemMessage ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <AlertCircle className="w-3 h-3" />
                            System
                          </span>
                        ) : (
                          `${comment.user?.firstName} ${comment.user?.lastName}`
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(comment.createdAt)}
                      </span>
                      {comment.isSystemMessage && (
                        <Badge variant="outline" className="text-xs">
                          {comment.systemEventType?.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        comment.isSystemMessage
                          ? 'bg-muted/50 border'
                          : comment.userId === user?.id
                          ? comment.id.startsWith('optimistic-')
                            ? 'bg-primary/70 text-primary-foreground'
                            : 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                      {comment.content.includes("📎 Uploaded") && (() => {
                        const names = parseUploadedFilenames(comment.content);
                        const matched = names
                          .map((n) => findAttachmentByName(n))
                          .filter(Boolean) as NonNullable<Task["attachments"]>;
                        if (matched.length === 0) return null;
                        return (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {matched.map((f) => (
                              <FilePreviewCard
                                key={f.id}
                                compact
                                file={{
                                  id: f.id,
                                  name: f.fileName,
                                  url: f.fileUrl,
                                  type: f.fileType,
                                }}
                                onClick={() =>
                                  setPreview({
                                    url: f.fileUrl,
                                    type: f.fileType,
                                    name: f.fileName,
                                    attachmentId: f.id,
                                    alreadyInDocs: true,
                                  })
                                }
                              />
                            ))}
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

        {/* Chat input */}
        <div className="border-t pt-3">
          <div className="flex gap-2">
            <div className="flex flex-col gap-2 flex-1">
              <Textarea
                placeholder="Type a message..."
                rows={2}
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                className="flex-1 text-sm"
                disabled={sendingComment}
              />
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  multiple
                  ref={chatFileInputRef}
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, true)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-muted-foreground"
                  onClick={() => chatFileInputRef.current?.click()}
                  disabled={uploadingFiles}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Attach File
                </Button>
              </div>
            </div>
            <Button
              size="icon"
              onClick={() => handleSendComment()}
              disabled={!newComment.trim() || sendingComment}
              className="flex-shrink-0 self-end"
            >
              {sendingComment ? (
                <Clock className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  // ============================================================
  // Workbench render helpers
  // ============================================================

  if (loading || !task) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
          {loading ? "Loading task…" : "Task not found"}
        </div>
      </DashboardLayout>
    );
  }

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

  const daysLeft = (deadline?: string) => {
    if (!deadline) return null;
    const ms = new Date(deadline).getTime() - Date.now();
    const d = Math.ceil(ms / 86400000);
    if (d < 0) return { text: `${Math.abs(d)}d overdue`, tone: "text-destructive" };
    if (d === 0) return { text: "Due today", tone: "text-warning" };
    return { text: `${d} day${d === 1 ? "" : "s"} left`, tone: "text-warning" };
  };

  const TaskListPanel = (
    <div className="flex h-full flex-col bg-background">
      <div className="p-4 border-b space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Task Workbench</h2>
          <Button variant="ghost" size="icon" onClick={() => listQuery.refetch()} className="h-8 w-8">
            <RefreshCw className={cn("h-4 w-4", listQuery.isFetching && "animate-spin")} />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={listSearch}
            onChange={(e) => {
              setListSearch(e.target.value);
              setListPage(1);
            }}
            placeholder="Search tasks..."
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
            const isSelected = t.id === task.id;
            const dl = daysLeft(t.deadline);
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
                          <AvatarImage src={(t.assignee as any).profilePictureUrl} />
                          <AvatarFallback className="text-[8px]">
                            {getInitials(t.assignee.firstName, t.assignee.lastName)}
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

  const dl = daysLeft(task.deadline);
  const subtaskCount = getTaskSubtaskCount(task);
  const completedSub = (task.subtasks || []).filter((s: any) => s.status === "completed" || s.completed).length;
  const progressPct = subtaskCount > 0 ? Math.round((completedSub / subtaskCount) * 100) : 0;

  const DetailsPanel = (
    <div className="flex h-full flex-col overflow-hidden bg-muted/20">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold truncate">{task.title}</h1>
              <Badge className={cn("text-xs", STATUS_COLORS[task.status])}>{STATUS_LABEL[task.status]}</Badge>
              <Badge className={cn("text-xs", PRIORITY_COLORS[task.priority])}>{task.priority}</Badge>
              <button className="text-muted-foreground hover:text-yellow-500 transition">
                <Star className="h-4 w-4" />
              </button>
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => fetchTask()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingFiles} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload File
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Metadata cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> Deadline
            </div>
            <p className="font-semibold text-sm mt-1">{new Date(task.deadline).toLocaleDateString()}</p>
            {dl && <p className={cn("text-[11px] mt-0.5 font-medium", dl.tone)}>{dl.text}</p>}
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User2 className="h-3.5 w-3.5" /> Assignee
            </div>
            <div className="mt-1 flex items-center gap-2">
              {task.assignee ? (
                <>
                  <Avatar className="h-6 w-6"><AvatarImage src={(task.assignee as any).profilePictureUrl} /><AvatarFallback className="text-[10px]">{getInitials(task.assignee.firstName, task.assignee.lastName)}</AvatarFallback></Avatar>
                  <p className="font-semibold text-sm truncate">{task.assignee.firstName} {task.assignee.lastName}</p>
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
            <p className="font-semibold text-sm mt-1">{new Date((task as any).createdAt || Date.now()).toLocaleDateString()}</p>
            {task.creator && (
              <p className="text-[11px] text-muted-foreground truncate">
                by {task.creator.firstName} {task.creator.lastName}
              </p>
            )}
          </div>
        </div>

        {/* Overview */}
        <section className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <ListChecks className="h-4 w-4" /> Overview
          </h3>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {task.description || <span className="text-muted-foreground italic">No description provided.</span>}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Subtasks</p>
              <p className="font-bold text-lg">{completedSub}/{subtaskCount || 0}</p>
              <p className="text-[10px] text-muted-foreground">{progressPct}% completed</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Attachments</p>
              <p className="font-bold text-lg">{task.attachments?.length || 0}</p>
              <p className="text-[10px] text-muted-foreground">Files</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Comments</p>
              <p className="font-bold text-lg">{comments.length}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Watchers</p>
              <p className="font-bold text-lg">{getTaskWatcherCount(task)}</p>
              <p className="text-[10px] text-muted-foreground">Following</p>
            </div>
          </div>
        </section>

        {/* Subtasks */}
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
            initialSubtasks={task.subtasks || []}
            canEdit={canEditSubtasks && canCreateSubtasksByPolicy}
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
            initialRecentWatchers={task.recentWatchers || []}
            onChanged={(next) =>
              setTask((prev) => prev ? { ...prev, watcherCount: next.watcherCount, isWatching: next.isWatching, recentWatchers: next.recentWatchers } : prev)
            }
          />
        </section>

        {/* Status update */}
        {(user?.id === task.assigneeId ||
          (task as any).assignees?.some((a: any) => a.id === user?.id) ||
          user?.id === task.creator?.id ||
          ["manager", "executive", "admin", "team_member"].includes(user?.role || "")) && (
          <section className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-2">Update Status</p>
            <Select value={task.status} onValueChange={handleStatusChange} disabled={updating}>
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

  const ChatContent = (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {loadingComments ? (
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
                          {matched.map((f) => (
                            <FilePreviewCard
                              key={f.id}
                              compact
                              className={comment.userId === user?.id ? "bg-primary-foreground/10 border-primary-foreground/20 text-foreground" : ""}
                              file={{ id: f.id, name: f.fileName, url: f.fileUrl, type: f.fileType }}
                              onClick={() => setPreview({ url: f.fileUrl, type: f.fileType, name: f.fileName, attachmentId: f.id, alreadyInDocs: true })}
                            />
                          ))}
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
            placeholder="Type a message..."
            rows={2}
            value={newComment}
            onChange={(e) => { setNewComment(e.target.value); handleTyping(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
            className="flex-1 resize-none text-sm"
            disabled={sendingComment}
          />
          <div className="flex flex-col gap-1.5">
            <input type="file" multiple ref={chatFileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, true)} />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => chatFileInputRef.current?.click()} disabled={uploadingFiles}>
              <Paperclip className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" className="h-8 w-8" onClick={() => handleSendComment()} disabled={!newComment.trim() || sendingComment}>
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

  const FilesContent = (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FilesIcon className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Task Files</h3>
          <Badge variant="outline" className="text-[10px]">{task.attachments?.length || 0}</Badge>
        </div>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploadingFiles}>
          {uploadingFiles ? <Clock className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {task.attachments && task.attachments.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {task.attachments.map((file) => {
              const isOwner = user?.role === "admin" || user?.role === "manager" || user?.id === task.creator?.id;
              return (
                <FilePreviewCard
                  key={file.id}
                  file={{ id: file.id, name: file.fileName, url: file.fileUrl, type: file.fileType }}
                  onClick={() => setPreview({ url: file.fileUrl, type: file.fileType, name: file.fileName, attachmentId: file.id, alreadyInDocs: true })}
                  actions={
                    <>
                      <Button variant="secondary" size="icon" className="h-6 w-6" asChild>
                        <a href={file.fileUrl} download={file.fileName}><Download className="w-3 h-3" /></a>
                      </Button>
                      {isOwner && (
                        <Button variant="secondary" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteAttachment(file.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </>
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="py-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
            <FileText className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No files uploaded yet</p>
            <Button variant="link" size="sm" className="text-xs h-auto p-0 mt-1" onClick={() => fileInputRef.current?.click()}>Click to upload</Button>
          </div>
        )}
      </div>
    </div>
  );

  const ActivityContent = (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b shrink-0 flex items-center gap-2">
        <ActivityIcon className="h-4 w-4" />
        <h3 className="font-semibold text-sm">Activity</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <TaskActivityTimeline taskId={task.id} initialActivities={task.activities || []} />
      </div>
    </div>
  );

  const CollaborationPanel = (
    <div className="flex h-full flex-col bg-background">
      <Tabs value={rightTab} onValueChange={(v: any) => setRightTab(v)} className="flex h-full flex-col">
        <div className="border-b px-3 pt-2 shrink-0">
          <TabsList className="w-full bg-transparent p-0 h-auto gap-1">
            <TabsTrigger value="chat" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Chat
              {comments.length > 0 && <Badge variant="outline" className="text-[10px] ml-1 h-4 px-1">{comments.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="files" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md gap-1.5">
              <FilesIcon className="h-3.5 w-3.5" /> Files
              {(task.attachments?.length || 0) > 0 && <Badge variant="outline" className="text-[10px] ml-1 h-4 px-1">{task.attachments!.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md gap-1.5">
              <ActivityIcon className="h-3.5 w-3.5" /> Activity
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="chat" className="flex-1 m-0 overflow-hidden data-[state=inactive]:hidden">{ChatContent}</TabsContent>
        <TabsContent value="files" className="flex-1 m-0 overflow-hidden data-[state=inactive]:hidden">{FilesContent}</TabsContent>
        <TabsContent value="activity" className="flex-1 m-0 overflow-hidden data-[state=inactive]:hidden">{ActivityContent}</TabsContent>
      </Tabs>
    </div>
  );

  return (
    <>
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
      {renderMobileChatSheet()}

      <DashboardLayout>
        {isMobile ? (
          <div className="h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex border-b bg-background shrink-0">
              {(["list", "details", "chat"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => s === "chat" ? setShowChatSheet(true) : setMobileSection(s)}
                  className={cn(
                    "flex-1 py-3 text-xs font-medium capitalize transition",
                    mobileSection === s ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
                  )}
                >
                  {s === "list" ? "Tasks" : s === "details" ? "Details" : "Chat"}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              {mobileSection === "list" ? TaskListPanel : DetailsPanel}
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-4rem)]">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              <ResizablePanel defaultSize={22} minSize={16} maxSize={32}>
                {TaskListPanel}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={35}>
                {DetailsPanel}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={28} minSize={22} maxSize={40}>
                {CollaborationPanel}
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </DashboardLayout>
    </>
  );
};

export default TaskDetails;
