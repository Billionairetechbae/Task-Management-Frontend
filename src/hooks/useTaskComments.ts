// Create a new hook: src/hooks/useTaskComments.ts
import { useState, useCallback, useEffect } from 'react';
import { api, TaskComment } from '@/lib/api';
import { useWebSocket } from '@/contexts/WebSocketContext';

export const useTaskComments = (taskId: string | undefined) => {
  const { isConnected, on, off } = useWebSocket();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const response = await api.getTaskComments(taskId, { limit: 50 });
      
      // Only set if we haven't fetched before or if array is empty
      if (!hasFetched || comments.length === 0) {
        setComments(response.comments);
        setHasFetched(true);
      } else {
        // Merge and deduplicate
        const existingIds = new Set(comments.map(c => c.id));
        const newComments = response.comments.filter((c: TaskComment) => !existingIds.has(c.id));
        
        if (newComments.length > 0) {
          setComments(prev => [...prev, ...newComments]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId, hasFetched, comments.length]);

  // WebSocket listener for new comments
  useEffect(() => {
    if (!taskId || !isConnected) return;

    const handleNewComment = (message: any) => {
      if (message.comment && message.taskId === taskId) {
        setComments(prev => {
          // Deduplicate by ID
          if (prev.some(c => c.id === message.comment.id)) {
            return prev;
          }
          
          // Replace optimistic comment if exists
          const hasOptimistic = prev.some(c => 
            c.id.startsWith('temp_') && c.content === message.comment.content
          );
          
          if (hasOptimistic) {
            return prev.map(comment => 
              comment.id.startsWith('temp_') && comment.content === message.comment.content 
                ? message.comment 
                : comment
            );
          }
          
          return [...prev, message.comment];
        });
      }
    };

    on('new_comment', handleNewComment);
    return () => {
      off('new_comment', handleNewComment);
    };
  }, [taskId, isConnected, on, off]);

  // Initial fetch only once
  useEffect(() => {
    if (taskId && !hasFetched) {
      fetchComments();
    }
  }, [taskId, hasFetched, fetchComments]);

  // Function to add a comment (optimistic update)
  const addComment = useCallback(async (content: string): Promise<TaskComment | null> => {
    if (!taskId) return null;
    
    // Create optimistic comment
    const optimisticComment: TaskComment = {
      id: `temp_${Date.now()}`,
      taskId,
      userId: '', // Will be filled by WebSocket
      content,
      isSystemMessage: false,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: undefined
    };
    
    // Add optimistic comment immediately
    setComments(prev => [...prev, optimisticComment]);
    
    return optimisticComment;
  }, [taskId]);

  return {
    comments,
    loading,
    fetchComments,
    addComment,
    setComments
  };
};