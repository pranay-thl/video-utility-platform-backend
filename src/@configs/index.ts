import appRootPath from 'app-root-path';

export default {
  defaultRedisConfig: {
    redis: {
      port: +process.env.REDIS_PORT!,
      host: process.env.REDIS_HOST,
      password: process.env.REDIS_PASSWORD,
    },
  },
  nodeMediaServerConfig: {
    rtmp: {
      // host: process.env.NMS_RTMP_HOST || 'localhost',
      port: process.env.NMS_RTMP_PORT || 1935,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60,
    },
    http: {
      // host: process.env.NMS_HTTP_HOST || 'localhost',
      port: process.env.NMS_HTTP_PORT || 8001,
      allow_origin: '*',
      mediaroot:
        process.env.NMS_HTTP_MEDIA_ROOT || `${appRootPath}/uploads/liveMedia`,
    },
    trans: {
      ffmpeg: '/usr/local/bin/ffmpeg',
      tasks: [
        {
          app: 'live',
          hls: true,
          hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
          dash: true,
          dashFlags: '[f=dash:window_size=3:extra_window_size=5]',
        },
      ],
    },
  },
};
