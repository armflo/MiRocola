import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  LogOut,
  Share2,
  Check,
  Edit2,
  Save,
  ListMusic,
  Heart,
  ChevronRight
} from 'lucide-react';
import type { AuthUser, PlaylistDto } from '@mirocola/shared';
import { getDjRank } from '../lib/djRank';
import { authService } from '../services/auth';
import { playlistService } from '../services/playlist';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: AuthUser;
  authUser?: AuthUser;
  onUpdateUser: (user: AuthUser) => void;
  onLogout: () => void;
  onOpenPlaylist?: (slug: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  authUser,
  onUpdateUser,
  onLogout,
  onOpenPlaylist
}) => {
  const profileUser = authUser || user;
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(profileUser?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistDto[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  useEffect(() => {
    if (isOpen && profileUser) {
      setBioText(profileUser.bio || '');
      setIsLoadingPlaylists(true);
      playlistService.getMyPlaylists().then((res) => {
        setIsLoadingPlaylists(false);
        if (res.success) {
          setPlaylists(res.playlists);
        }
      });
    }
  }, [isOpen, profileUser]);

  if (!isOpen || !profileUser) return null;

  const rank = getDjRank(profileUser.djScore);

  // Progress to next rank
  let progressPercent = 100;
  if (rank.nextPoints) {
    const currentTierPoints = profileUser.djScore - rank.minPoints;
    const tierRange = rank.nextPoints - rank.minPoints;
    progressPercent = Math.min(100, Math.max(5, Math.floor((currentTierPoints / tierRange) * 100)));
  }

  const handleCopyProfileLink = () => {
    const url = `${window.location.origin}/u/${profileUser.username}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveBio = async () => {
    setIsSaving(true);
    const res = await authService.updateProfile({ bio: bioText });
    setIsSaving(false);
    if (res.success && res.user) {
      onUpdateUser(res.user);
      setIsEditingBio(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md my-auto bg-slate-900/95 border border-purple-800/60 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl text-white max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800/80 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* User Avatar & Rank Badge */}
          <div className="text-center pt-2">
            <div className="relative inline-block">
              <img
                src={profileUser.avatar}
                alt={profileUser.username}
                className="w-20 h-20 rounded-2xl border-2 border-pink-500 shadow-xl shadow-pink-500/20 bg-slate-950 p-1 mx-auto object-cover"
              />
              <span
                className="absolute -bottom-2 -right-2 text-xl p-1 rounded-xl bg-slate-950 border border-purple-700/60 shadow"
                title={rank.name}
              >
                {rank.emoji}
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-white mt-3">
              @{profileUser.username}
            </h2>
            <p className="text-xs text-purple-300 font-medium">{profileUser.email}</p>

            {/* Rank Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border mt-2 text-xs font-bold shadow-md shadow-purple-900/40 bg-gradient-to-r ${rank.badgeClass}`}
            >
              <span>{rank.emoji}</span>
              <span>{rank.name}</span>
              <span>•</span>
              <span>{profileUser.djScore} pts</span>
            </div>
          </div>

          {/* DJ Score Progress Card */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-purple-900/40">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <Award className="w-4 h-4 text-amber-400" />
                Nivel de DJ
              </span>
              <span className="font-mono text-purple-300 text-[11px]">
                {profileUser.djScore} {rank.nextPoints ? `/ ${rank.nextPoints} pts` : 'pts (Nivel Máximo)'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden mb-2 border border-purple-950">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-[10px] text-slate-400 leading-tight">
              {rank.description} Gana <span className="text-pink-400 font-bold">+10 pts</span> cuando voten tus temas, <span className="text-pink-400 font-bold">+20 pts</span> al sonar completos, y <span className="text-amber-400 font-bold">+25 pts</span> por guardar playlists.
            </p>
          </div>

          {/* Bio Section */}
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-purple-900/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-300">Biografía</span>
              {!isEditingBio ? (
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="text-[10px] text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Edit2 className="w-3 h-3" />
                  Editar
                </button>
              ) : (
                <button
                  onClick={handleSaveBio}
                  disabled={isSaving}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Save className="w-3 h-3" />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              )}
            </div>

            {!isEditingBio ? (
              <p className="text-xs text-slate-300 italic">
                "{profileUser.bio || '¡Amante de la música en MiRocola!'}"
              </p>
            ) : (
              <textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                maxLength={250}
                rows={2}
                className="w-full p-2 rounded-xl bg-slate-900 border border-purple-800/50 text-xs text-white focus:outline-none focus:border-pink-500 resize-none"
                placeholder="Escribe algo sobre tus gustos musicales..."
              />
            )}
          </div>

          {/* Saved Playlists Section */}
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-purple-900/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <ListMusic className="w-3.5 h-3.5 text-pink-400" />
                Mis Playlists ({playlists.length})
              </span>
            </div>

            {isLoadingPlaylists ? (
              <p className="text-[11px] text-slate-500 py-2 text-center">Cargando tus playlists...</p>
            ) : playlists.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-2 text-center">
                Aún no has guardado ninguna playlist. ¡Usa el botón "Guardar Playlist" en la cola de la rocola!
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => onOpenPlaylist?.(pl.slug)}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900 hover:bg-purple-950/40 border border-purple-900/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white group-hover:text-pink-300 truncate">
                        {pl.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{pl.songsCount} canciones</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-pink-400">
                          <Heart className="w-2.5 h-2.5 fill-pink-500" />
                          {pl.likesCount}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* Share Profile */}
            <button
              onClick={handleCopyProfileLink}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-purple-800/50 text-xs font-bold text-purple-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">¡Enlace de Perfil Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-pink-400" />
                  <span>Compartir mi Perfil con Amigos</span>
                </>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                authService.clearSession();
                onLogout();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-red-950/30 hover:bg-red-950/60 border border-red-900/40 text-xs font-bold text-red-400 hover:text-red-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
