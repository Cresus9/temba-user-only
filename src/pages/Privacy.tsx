import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase-client';
import { Loader } from 'lucide-react';

export default function Privacy() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('content')
        .eq('slug', 'privacy-policy')
        .single();

      if (!error && data) {
        setContent(data.content);
      }
      setLoading(false);
    };

    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
      <div className="prose prose-indigo max-w-none">
        {content ? (
          <div dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <p>Privacy policy content is currently being updated.</p>
        )}
      </div>
    </div>
  );
}