import { Button } from "@/components/ui/button";
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

import { X, Send, Clock, User2, MessageSquare, User, Clock4, AlertCircle, CheckCircle } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { api, Task, TaskComment } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";

import { getFileIcon } from "@/utils/fileIcons";
import AttachmentPreview from "@/components/AttachmentPreview";

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
  const { toast } = useToast();
  const { isConnected, joinTaskRoom, leaveTaskRoom, sendComment, sendTypingIndicator, on, off } = useWebSocket();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<CorrectedTaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [preview, setPreview] = useState<{
    url: string;
    type: string;
    name: string;
  } | null>(null);
  
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [pendingComments, setPendingComments] = useState<Map<string, {content: string, timestamp: number}>>(new Map());
  
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
        
        const isOwnComment = message.userId === user?.id;
        
        if (isOwnComment && message.messageId) {
          console.log('Processing echoed comment:', message.messageId);
          
          // Remove from pending
          setPendingComments(prev => {
            const newMap = new Map(prev);
            newMap.delete(message.messageId);
            return newMap;
          });
          
          // Remove the optimistic comment and add the real one
          setComments(prev => {
            // Check if we already have this comment
            const alreadyExists = prev.some(c => c.id === fixedComment.id);
            if (alreadyExists) {
              return prev;
            }
            
            // Filter out optimistic comment with matching content
            const filtered = prev.filter(comment => {
              if (comment.id.startsWith('optimistic-') && comment.userId === user?.id) {
                // Check if content matches
                return comment.content !== fixedComment.content;
              }
              return true;
            });
            
            // Add the fixed comment
            return [...filtered, fixedComment];
          });
        } else {
          // Comment from another user
          setComments(prev => {
            // Check if comment already exists
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
      await api.updateTask(task.id, { status: newStatus as any });
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

  const handleSendComment = async () => {
    if (!id || !newComment.trim() || sendingComment) return;
    
    const content = newComment.trim();
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
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
          role: user?.role || 'assistant',
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
          // Send via WebSocket with messageId
          sendComment(id, content);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading task…
      </div>
    );
  }

  if (!task) return null;

  return (
    <>
      {/* Preview Modal */}
      {preview && (
        <AttachmentPreview
          url={preview.url}
          type={preview.type}
          name={preview.name}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Main Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

          {/* HEADER */}
          <div className="p-6 border-b flex justify-between items-start">
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-bold">{task.title}</h1>

              <div className="flex gap-3 flex-wrap">
                <Badge className={`px-3 py-1 ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority.toUpperCase()}
                </Badge>

                <Badge className={`px-3 py-1 ${STATUS_COLORS[task.status]}`}>
                  {STATUS_LABEL[task.status]}
                </Badge>
                
                {!isConnected && (
                  <Badge variant="outline" className="text-xs">
                    Offline mode
                  </Badge>
                )}
              </div>
            </div>

            <Button variant="ghost" onClick={() => navigate(-1)}>
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* MAIN CONTENT - Split into two columns */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left column - Task details */}
            <div className="flex-1 p-6 overflow-y-auto border-r">
              {/* GRID INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-semibold">{task.category}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="font-semibold">
                    {new Date(task.deadline).toLocaleString()}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">
                    {user?.role === "assistant"
                      ? "Assigned By Executive"
                      : "Assigned Assistant"}
                  </p>
                  <div className="flex items-center gap-2 font-semibold">
                    <User2 className="w-4 h-4 text-primary" />
                    {user?.role === "assistant"
                      ? `${task.creator?.firstName} ${task.creator?.lastName}`
                      : task.assignee
                      ? `${task.assignee.firstName} ${task.assignee.lastName}`
                      : "Unassigned"}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Hours</p>
                  <p className="font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {task.actualHours
                      ? `${task.actualHours}h (actual)`
                      : "No actual hours"}{" "}
                    • {task.estimatedHours}h estimated
                  </p>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div className="mb-6">
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm leading-relaxed">{task.description}</p>
              </div>

              {/* ATTACHMENTS */}
              {task.attachments && task.attachments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-2">Attachments</h3>

                  <div className="grid gap-3">
                    {task.attachments.map((file) => {
                      const Icon = getFileIcon(file.fileType, file.fileName);

                      return (
                        <div
                          key={file.id}
                          className="p-3 border rounded-lg flex gap-4 hover:bg-muted transition cursor-pointer"
                          onClick={() =>
                            setPreview({
                              url: file.fileUrl,
                              type: file.fileType,
                              name: file.fileName,
                            })
                          }
                        >
                          {/* ICON */}
                          <Icon className="w-8 h-8 text-primary" />

                          {/* DETAILS */}
                          <div className="flex-1">
                            <p className="font-semibold">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.fileType}
                            </p>
                          </div>

                          {/* DOWNLOAD BUTTON */}
                          <a
                            href={file.fileUrl}
                            download={file.fileName}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary underline text-sm"
                          >
                            Download
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STATUS UPDATE */}
              {user?.role === "assistant" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Update Status</p>

                  <Select
                    value={task.status}
                    onValueChange={handleStatusChange}
                    disabled={updating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Right column - Chat */}
            <div className="flex-1 flex flex-col border-l">
              {/* Chat header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <h3 className="font-semibold">Task Chat</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {typingUsers.size > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock4 className="w-3 h-3" />
                        {typingUsers.size} user{typingUsers.size > 1 ? 's' : ''} typing...
                      </span>
                    )}
                    {onlineUsers.size > 0 && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {onlineUsers.size} online
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4">
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
                          <AvatarImage src={comment.user?.profilePictureUrl} /> {/* Changed to profilePictureUrl */}
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
                            <p className="text-sm">{comment.content}</p>
                            {comment.id.startsWith('optimistic-') && (
                              <div className="text-xs opacity-70 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-spin" />
                                Sending...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={commentsEndRef} />
                  </div>
                )}
              </div>

              {/* Chat input */}
              <div className="p-4 border-t bg-muted/40">
                <div className="flex gap-3">
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
                    className="flex-1"
                    disabled={sendingComment}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendComment}
                    disabled={!newComment.trim() || sendingComment}
                  >
                    {sendingComment ? (
                      <Clock className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                  {!isConnected && (
                    <span className="text-yellow-600">Connection lost - using HTTP fallback</span>
                  )}
                </div>
              </div>
            </div>
          </div> 
        </div>
      </div>
    </>
  );
};

export default TaskDetails;