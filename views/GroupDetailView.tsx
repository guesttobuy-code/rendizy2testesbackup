import React, { useState, useEffect } from 'react';
import { ChevronLeft, Users, Lock, Globe, Plus, Loader2, MessageCircle, Heart, Share2 } from 'lucide-react';
import { groupsService } from '../lib/supabase/groups';
import { postsService } from '../lib/supabase/posts';
import { useAuth } from '../contexts/AuthContext';
import CreatePostModal from '../components/CreatePostModal';

interface GroupDetailViewProps {
  groupId: string;
  onBack: () => void;
  onCreatePost?: () => void;
}

const GroupDetailView: React.FC<GroupDetailViewProps> = ({ groupId, onBack, onCreatePost }) => {
  const { user } = useAuth();
  const [group, setGroup] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  useEffect(() => {
    loadGroup();
    loadPosts();
    checkMembership();
  }, [groupId]);

  const loadGroup = async () => {
    setLoading(true);
    try {
      const { data, error } = await groupsService.getById(groupId);
      if (error) {
        console.error('Erro ao carregar grupo:', error);
      } else {
        setGroup(data);
      }
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const { data, error } = await postsService.list({ groupId, limit: 20 });
      if (error) {
        console.error('Erro ao carregar posts:', error);
      } else {
        setPosts(data || []);
      }
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const checkMembership = async () => {
    if (!user) return;
    try {
      const { data, error } = await groupsService.isMember(groupId, user.id);
      if (!error && data !== undefined) {
        setIsMember(data);
      }
    } catch (err) {
      console.error('Erro ao verificar membro:', err);
    }
  };

  const handleJoinGroup = async () => {
    if (!user) {
      alert('Você precisa estar logado para entrar no grupo');
      return;
    }

    try {
      const { error } = await groupsService.joinGroup(groupId);
      if (error) {
        alert('Erro ao entrar no grupo: ' + error.message);
      } else {
        setIsMember(true);
        await loadGroup();
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;

    if (!confirm('Tem certeza que deseja sair do grupo?')) return;

    try {
      const { error } = await groupsService.leaveGroup(groupId);
      if (error) {
        alert('Erro ao sair do grupo: ' + error.message);
      } else {
        setIsMember(false);
        await loadGroup();
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-miggro-teal" size={32} />
        <span className="ml-3 text-gray-600">Carregando grupo...</span>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Grupo não encontrado</p>
          <button
            onClick={onBack}
            className="text-miggro-teal hover:underline"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="px-4 py-4 bg-white border-b border-gray-200 flex items-center space-x-3 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">{group.name}</h1>
      </header>

      {/* Group Info */}
      <div className="bg-white p-4 mb-4">
        {group.image_url && (
          <img
            src={group.image_url}
            alt={group.name}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">{group.name}</h2>
          <div className="flex items-center space-x-2">
            {group.is_private ? (
              <Lock size={16} className="text-gray-500" />
            ) : (
              <Globe size={16} className="text-gray-500" />
            )}
            <span className="text-xs text-gray-500">
              {group.is_private ? 'Privado' : 'Público'}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">{group.description}</p>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Users size={16} />
            <span>{group.members_count || 0} membros</span>
          </div>
        </div>
        {isMember ? (
          <div className="flex space-x-2 mt-4">
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="flex-1 bg-miggro-teal text-white py-2 rounded-lg font-bold text-sm hover:bg-teal-700 transition-colors flex items-center justify-center"
            >
              <Plus size={16} className="mr-2" />
              Criar Post
            </button>
            <button
              onClick={handleLeaveGroup}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Sair
            </button>
          </div>
        ) : (
          <button
            onClick={handleJoinGroup}
            className="w-full bg-miggro-teal text-white py-2 rounded-lg font-bold text-sm hover:bg-teal-700 transition-colors mt-4"
          >
            Entrar no Grupo
          </button>
        )}
      </div>

      {/* Posts */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <h3 className="font-bold text-gray-800 mb-3">Posts do Grupo</h3>
        {loadingPosts ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-miggro-teal mr-2" size={20} />
            <span className="text-gray-600 text-sm">Carregando posts...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Ainda não há posts neste grupo.</p>
            {isMember && (
              <button
                onClick={() => setIsPostModalOpen(true)}
                className="mt-4 text-miggro-teal hover:underline text-sm"
              >
                Criar o primeiro post
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post: any) => {
              const author = post.author || {};
              return (
                <div key={post.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-3 mb-3">
                    <img
                      src={author.avatar_url || 'https://via.placeholder.com/40'}
                      alt={author.name || 'Usuário'}
                      className="w-10 h-10 rounded-full border border-gray-100"
                    />
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900">{author.name || 'Usuário'}</h4>
                      <p className="text-xs text-gray-400">
                        {post.created_at ? new Date(post.created_at).toLocaleDateString('pt-BR') : 'Agora'}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-800 text-sm mb-3 leading-relaxed">{post.content}</p>
                  {post.image_urls && post.image_urls.length > 0 && (
                    <img
                      src={post.image_urls[0]}
                      alt="Post"
                      className="w-full rounded-lg mb-3"
                    />
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-red-500">
                      <Heart size={18} />
                      <span className="text-xs">{post.likes_count || 0}</span>
                    </button>
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-500">
                      <MessageCircle size={18} />
                      <span className="text-xs">{post.comments_count || 0}</span>
                    </button>
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-green-500">
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {isPostModalOpen && (
        <CreatePostModal
          groupId={groupId}
          onClose={() => setIsPostModalOpen(false)}
          onSuccess={() => {
            setIsPostModalOpen(false);
            loadPosts();
            if (onCreatePost) onCreatePost();
          }}
        />
      )}
    </div>
  );
};

export default GroupDetailView;
