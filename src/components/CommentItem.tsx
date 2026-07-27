import { useState } from 'react';
import { censorMessage } from '../utils/censor';

export interface CommentData {
  id: string;
  confession_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  users: {
    username: string;
    avatar_url: string;
  };
}

interface CommentItemProps {
  comment: CommentData;
  allComments: CommentData[];
  onReply: (parentId: string, content: string) => Promise<void>;
}

export default function CommentItem({ comment, allComments, onReply }: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find all comments that are direct replies to this specific comment
  const replies = allComments.filter(c => c.parent_id === comment.id);
  const displayAvatar = comment.users.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${comment.users.username}`;

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    await onReply(comment.id, replyContent);
    setReplyContent('');
    setIsReplying(false);
    setIsSubmitting(false);
  };

  return (
    <div className="mt-4">
      <div className="flex gap-3">
        <img src={displayAvatar} alt={comment.users.username} className="w-8 h-8 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
              {comment.users.username}
            </h4>
            <p className="text-gray-800 dark:text-gray-200 text-sm mt-1 whitespace-pre-wrap">
              {censorMessage(comment.content)}
            </p>
          </div>
          
          <div className="flex items-center gap-4 mt-1 ml-2 text-xs text-gray-500 font-medium">
            <span>{new Date(comment.created_at).toLocaleDateString()}</span>
            <button 
              onClick={() => setIsReplying(!isReplying)}
              className="hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
            >
              Reply
            </button>
          </div>

          {/* Reply Input Form */}
          {isReplying && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Reply to ${comment.users.username}...`}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
              <button
                onClick={handleReplySubmit}
                disabled={isSubmitting || !replyContent.trim()}
                className="bg-black dark:bg-white text-white dark:text-black px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-50"
              >
                Post
              </button>
            </div>
          )}

          {/* Nested Replies Rendering (Recursive) */}
          {replies.length > 0 && (
            <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 mt-2">
              {replies.map(reply => (
                <CommentItem 
                  key={reply.id} 
                  comment={reply} 
                  allComments={allComments} 
                  onReply={onReply} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
