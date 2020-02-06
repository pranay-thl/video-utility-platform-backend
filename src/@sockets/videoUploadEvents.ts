import socketIo from 'socket.io';
import fs from 'fs';
import appRootPath from 'app-root-path';
import { server } from '../@server';
import VideoModel from '../@models/VideoModel';
import { videoConverterQueue } from '../@jobs';

interface Ifiles {
  [key: string]: {
    fileSize: number;
    data: string;
    downloaded: number;
    handler?: number;
  };
}
const files: Ifiles = {};

const io = socketIo(server);

io.sockets.on('connection', socket => {
  socket.on('connect', () => console.log('Client connected'));
  socket.on('disconnect', () => console.log('Client disconnected'));

  // This event will be called only once
  // Either while starting the file upload or resuming the file upload
  socket.on('Start', data => {
    const name = data.Name as string;
    const filePath = `${appRootPath}/uploads/${name}`;
    files[name] = {
      fileSize: data.Size,
      data: '',
      downloaded: 0,
    };

    let position = 0;
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        files[name].downloaded = stat.size;
        position = stat.size / 524288; // We'll pass this data in half-megabyte increments, which comes out to 524288 bytes.
      }
    } catch {
      console.log('New file detected...');
    }

    fs.open(filePath, 'a', 0o755, (error, fd) => {
      if (error) {
        console.log('Error while opening the file....');
        console.log(error);
      } else {
        files[name].handler = fd; // We store the file handler so we can write to it later
        socket.emit('MoreData', {
          Place: position,
          Percent: 0 /* recalculate percentage when resuming? */,
        });
      }
    });
  });

  socket.on('Upload', data => {
    const name = data.Name;
    files[name].downloaded += data.Data.length;
    files[name].data += data.Data;

    if (files[name].downloaded === files[name].fileSize) {
      // If File is Fully Uploaded
      fs.write(
        files[name].handler!,
        files[name].data,
        null,
        'Binary',
        (_, __) => {
          // Get Thumbnail Here
          VideoModel.create({ name }).then(video => {
            videoConverterQueue.add({ name, videoId: video.id });
            socket.emit('Done', { videoId: video.id });
          });
        },
      );
    } else if (files[name].data.length > 10485760) {
      // If the Data Buffer reaches 10MB
      fs.write(
        files[name].handler!,
        files[name].data,
        null,
        'Binary',
        (_, __) => {
          files[name].data = ''; // Reset The Buffer
          const position = files[name].downloaded / 524288;
          const percent = (files[name].downloaded / files[name].fileSize) * 100;
          socket.emit('MoreData', { Place: position, Percent: percent });
        },
      );
    } else {
      const position = files[name].downloaded / 524288;
      const percent = (files[name].downloaded / files[name].fileSize) * 100;
      socket.emit('MoreData', { Place: position, Percent: percent });
    }
  });
});
