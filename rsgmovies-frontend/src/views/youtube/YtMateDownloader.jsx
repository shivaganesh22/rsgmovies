import React, { useState } from 'react';
import {
  Download,
  Link as LinkIcon,
  Search,
  Youtube as YoutubeIcon,
  Music,
  Video,
  User,
  Clock3,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import youtubeApi from '../../api/youtube';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { toastError, toastSuccess } from '../../components/ui/Notifications';
import { getMediaProxyUrl, getSafeMediaFilename } from '../../utils/media';

const formats = [
  { format: 'mp3', quality: '320', label: '320 kbps MP3', extension: 'mp3', type: 'audio', detail: 'High quality audio track' },
  { format: 'mp3', quality: '256', label: '256 kbps MP3', extension: 'mp3', type: 'audio', detail: 'Balanced audio quality' },
  { format: 'mp3', quality: '128', label: '128 kbps MP3', extension: 'mp3', type: 'audio', detail: 'Compact audio download' },
  { format: 'mp4', quality: '1080', label: '1080p Full HD', extension: 'mp4', type: 'video', detail: 'Full HD video download' },
  { format: 'mp4', quality: '720', label: '720p HD', extension: 'mp4', type: 'video', detail: 'HD video download' },
  { format: 'mp4', quality: '360', label: '360p', extension: 'mp4', type: 'video', detail: 'Standard video download' },
  { format: 'mp4', quality: '240', label: '240p', extension: 'mp4', type: 'video', detail: 'Small video download' },
  { format: 'mp4', quality: '144', label: '144p', extension: 'mp4', type: 'video', detail: 'Low-bandwidth video download' },
];

export const YtMateDownloader = () => {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [activeTab, setActiveTab] = useState('video');

  const analyze = async (event) => {
    event.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    try {
      setResult(await youtubeApi.getYtMateInfo(url.trim()));
    } catch (error) {
      toastError(error?.response?.data?.error || 'Could not fetch YT Mate formats.');
    } finally {
      setLoading(false);
    }
  };

  const downloadFormat = async (format, index) => {
    if (!result?.video_id) {
      toastError('Video details are missing. Analyze the link again.');
      return;
    }
    setDownloading(index);
    try {
      const response = await youtubeApi.convertYtMate(result.video_id, format.format, format.quality);
      const directUrl = response?.download_url;
      if (!directUrl) throw new Error('No download URL returned');
      const filename = response.filename || getSafeMediaFilename(`${result?.title || 'youtube-video'}_${format.quality}`, format.extension);
      const anchor = document.createElement('a');
      anchor.href = directUrl.startsWith('/')
        ? `${directUrl}${directUrl.includes('?') ? '&' : '?'}filename=${encodeURIComponent(filename)}`
        : getMediaProxyUrl(directUrl, { download: true, filename });
      anchor.download = filename;
      anchor.click();
      toastSuccess('Download started.');
    } catch (error) {
      toastError(error?.response?.data?.error || error.message || 'Could not start this download.');
    } finally {
      setDownloading(null);
    }
  };

  const title = result?.title || 'YT Mate results';
  const videoFormats = formats.filter((format) => format.type === 'video');
  const audioFormats = formats.filter((format) => format.type === 'audio');
  const visibleFormats = activeTab === 'video' ? videoFormats : audioFormats;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto pb-24 px-2 sm:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-2">
          <YoutubeIcon size={14} />
            <span>YT Mate Direct Converter</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">YT Mate Downloader</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Convert YouTube videos to MP4 or MP3 with selectable quality.</p>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <Sparkles size={14} className="text-blue-400" />
          <span>Fast conversion</span>
          <span className="text-gray-600">•</span>
          <span>No server storage</span>
        </div>
      </div>

      <form onSubmit={analyze} className="flex gap-2 max-w-xl w-full">
        <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Paste YouTube video URL..." icon={<Search size={16} />} />
        <Button type="submit" variant="primary" isLoading={loading} className="font-bold flex-shrink-0 bg-blue-600 hover:bg-blue-500" icon={<LinkIcon size={14} />}>Extract</Button>
      </form>

      {loading && (
        <div className="rounded-3xl glass-panel p-8 border border-white/10 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-gray-300">Fetching video details and conversion options...</p>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
          <div className="relative rounded-3xl glass-panel p-5 sm:p-8 border border-white/10 overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row gap-5 border-b border-white/10 pb-5">
            {result.thumbnail_url && (
              <img
                src={result.thumbnail_url}
                alt={title}
                className="w-full sm:w-64 aspect-video object-cover rounded-2xl border border-white/10 shadow-xl"
              />
            )}
            <div className="min-w-0 flex-1 flex flex-col justify-center gap-2">
              <span className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-300 text-xs font-bold">
                <CheckCircle2 size={13} />
                YT Mate Verified Video
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-white leading-snug">{title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 py-2 border-y border-white/10">
                {result.author_name && <div className="flex items-center gap-1.5 font-bold text-white"><User size={14} className="text-blue-400" /><span>{result.author_name}</span></div>}
                <div className="flex items-center gap-1.5"><Clock3 size={14} className="text-gray-400" /><span>MP4 & MP3 conversion</span></div>
              </div>
              <p className="text-xs text-gray-500">Choose a format below to start a direct download.</p>
            </div>
          </div>
          </div>

          <div className="rounded-3xl glass-panel p-5 sm:p-8 border border-white/10 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveTab('video')} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'video' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-surface hover:bg-white/10 text-gray-300 border border-white/5'}`}>
                  <Video size={14} />
                  <span>Video Downloads ({videoFormats.length})</span>
                </button>
                <button onClick={() => setActiveTab('audio')} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'audio' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-surface hover:bg-white/10 text-gray-300 border border-white/5'}`}>
                  <Music size={14} />
                  <span>Audio Tracks ({audioFormats.length})</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {visibleFormats.map((format) => {
                const index = formats.indexOf(format);
                const isHd = format.quality === '1080';
                const isAudio = format.type === 'audio';
                return (
                <div key={`${format.format}-${format.quality}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl bg-surface-elevated border border-white/5 hover:border-blue-500/30 transition group shadow">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${isAudio ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : isHd ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                      {isAudio ? `${format.quality}K` : `${format.quality}p`}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-white truncate block">{format.label}</span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 text-[10px] font-bold border border-blue-500/20 flex-shrink-0">YT Mate</span>
                      </div>
                      <span className="text-[11px] font-semibold text-gray-400 mt-0.5 block">{format.detail} • {format.extension.toUpperCase()} file</span>
                    </div>
                  </div>
                  <Button type="button" variant="primary" size="sm" isLoading={downloading === index} onClick={() => downloadFormat(format, index)} icon={isAudio ? <Music size={14} /> : <Download size={14} />} className="w-full sm:w-auto justify-center whitespace-nowrap bg-blue-600 hover:bg-blue-500">
                    Download {format.label}
                  </Button>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="rounded-3xl glass-panel p-8 sm:p-12 text-center border border-white/10 space-y-4 max-w-xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            <YoutubeIcon size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-white">YT Mate Direct Converter</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">Paste a public YouTube video link above to unlock MP4 video and MP3 audio downloads in multiple qualities.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default YtMateDownloader;
