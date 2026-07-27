import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfessionCard, { ConfessionData } from '../components/ConfessionCard';
import CommentList from '../components/CommentList';
import { CommentData } from '../components/CommentItem';
import { Skeleton } from '../components/Skeleton';

export default function SingleConfession() {
  const { confession_id } = useParams<{ confession_id: string }>();
  const [confession, setConfession] = useState<ConfessionData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPageData = async () => {
      if (!confession_id) return;

      // 1. Fetch the Confession
      const { data: confessionData } = await supabase
        .from('confessions')
        .select('*, users(username, avatar_url)')
        .eq('id', confession_id)
        .single();

      // 2. Fetch all Comments for this confession
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, users(username, avatar_url)')
        .eq('confession_id', confession_id)
        .order('created_at', { ascending: true }); // Oldest first for threads

      if (confessionData) setConfession(confessionData as unknown as ConfessionData);
      if (commentsData) setComments(commentsData as unknown as CommentData[]);
      
      setIsLoading(false);
    };

    fetchPageData();
  }, [confession_id]);

  // Handles adding both root comments and nested replies
  const handleAddComment = async (parentId: string | null, content: string) => {
    if (!confession_id) return;

    // Get current authenticated user (Assuming auth is setup in Supabase)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to comment.");
      return;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        confession_id,
        user_id: user.id,
        parent_id: parentId,
        content: content
      })
      .select('*, users(username, avatar_url)')
      .single();

    if (!error && data) {
      // Optimistically append the new comment to our state
      setComments(prev => [...prev, data as unknown as CommentData]);
    } else {
      console.error("Error adding comment:", error?.message);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto w-full p-4 md:p-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6">
          <div className="flex gap-3 mb-4"><Skeleton className="w-10 h-10 rounded-full"/><Skeleton className="h-4 w-32 mt-2"/></div>
          <Skeleton className="h-6 w-full mb-3" />
          <Skeleton className="h-6 w-4/5" />
        </div>
        <Skeleton className="h-10 w-full mb-6" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!confession) {
    return <div className="text-center py-12">Confession not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto w-full p-4 md:p-8">
      {/* 
        We pass the confession data to our existing card component. 
        Because we set e.stopPropagation() in ConfessionCard previously, 
        interacting with the card here won't cause strange routing behavior.
      */}
      <ConfessionCard confession={confession} />
      
      <CommentList 
        comments={comments} 
        onAddComment={handleAddComment} 
      />
    </div>
  );
}
