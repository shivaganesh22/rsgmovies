export const getMediaFileType = (sourceUrl, stream = {}) => {
  const explicitType = stream.filetype || stream.ext || stream.extension;
  if (explicitType) {
    return String(explicitType).split('/').pop().replace(/^\./, '').toLowerCase();
  }
  const path = String(sourceUrl || '').split('?')[0].split('#')[0];
  const match = path.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : 'mp4';
};

export const isMkvMedia = (sourceUrl, stream = {}) => {
  return getMediaFileType(sourceUrl, stream) === 'mkv' ||
    /\bmkv\b/i.test(`${stream.video_name || ''} ${stream.quality || ''}`);
};

export const getMediaProxyUrl = (sourceUrl, options = {}) => {
  if (!sourceUrl) return '';
  if (isMkvMedia(sourceUrl, options.stream) && !options.download) return sourceUrl;
  if (sourceUrl.includes('/api/media/proxy/')) return sourceUrl;
  const params = new URLSearchParams({ url: sourceUrl });
  if (options.download) params.set('download', '1');
  if (options.filename) params.set('filename', options.filename);
  return `/api/media/proxy/?${params.toString()}`;
};

export const getSafeMediaFilename = (title, extension = 'mp4') => {
  const cleanTitle = (title || 'video').replace(/[^\w\s.-]/g, '').trim().substring(0, 100) || 'video';
  return `${cleanTitle}.${extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp4'}`;
};

export const getStreamDownloadFilename = (title, stream, sourceUrl) => {
  const server = stream?.server || stream?.video_name || 'server';
  const fileType = getMediaFileType(sourceUrl, stream);
  return getSafeMediaFilename(`${title}_${server}`, fileType);
};

export const formatRuntime = (runtime) => {
  if (!runtime) return null;
  const str = String(runtime).trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const parts = str.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  const match = str.match(/\d+/);
  if (!match) return str;
  const totalMinutes = parseInt(match[0], 10);
  if (isNaN(totalMinutes) || totalMinutes <= 0) return str;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const formatDateTimeIST = (dateStr) => {
  if (!dateStr) return '';
  try {
    let str = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(str)) {
      str = str.replace(' ', 'T') + 'Z';
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      str = str + 'T00:00:00Z';
    }
    
    const parsedDate = new Date(str);
    if (isNaN(parsedDate.getTime())) {
      return String(dateStr);
    }

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(parsedDate);
  } catch (e) {
    return String(dateStr);
  }
};


