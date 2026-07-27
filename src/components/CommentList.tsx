import { useState } from 'react';
import CommentItem, { CommentData } from './CommentItem';

interface CommentListProps {
  comments: CommentData[];
  onAddComment: (parentId: string | null, content: string) => Promise<void>;
}

export default function CommentList({ comments, onAddComment }: CommentListProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only pass top-level comments (those without a parent) to the root level.
  // The CommentItem component will recursively render the rest.
  const rootComments = comments.filter(c => !c.parent_id);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    await onAddComment(null, newComment);
    setNewComment('');
    setIsSubmitting(false);
  };

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
      <h3 className="text-lg font-bold mb-4">Comments ({comments.length})</h3>
      
      {/* Top-level comment input */}
      <div className="flex gap-3 mb-8">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
          rows={2}
        />
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !newComment.trim()}
          className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-medium self-end disabled:opacity-50"
        >
          Post
        </button>
      </div>

      {/* Render Root Comments */}
      <div className="space-y-4">
        {rootComments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No comments yet. Be the first to start the conversation!</p>
        ) : (
          rootComments.map(comment => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              allComments={comments} 
              onReply={onAddComment} 
            />
          ))
        )}
      </div>
    </div>
  );
}
