const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: '只允許 POST 請求' })
    };
  }

  try {
    const { url, startTime, endTime } = JSON.parse(event.body);

    // 驗證 YouTube URL
    if (!ytdl.validateURL(url)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '無效的 YouTube URL' })
      };
    }

    // 獲取影片信息
    const info = await ytdl.getInfo(url);
    const videoTitle = info.videoDetails.title;
    const sanitizedTitle = videoTitle.replace(/[^\w\s]/gi, '_');

    // 創建臨時文件名
    const fileName = `${sanitizedTitle}_${Date.now()}.mp3`;
    const tempFile = `/tmp/${fileName}`;

    // 下載並轉換音訊
    const stream = ytdl(url, { quality: 'highestaudio' });
    
    await new Promise((resolve, reject) => {
      ffmpeg(stream)
        .toFormat('mp3')
        .setStartTime(startTime)
        .setDuration(endTime)
        .on('end', resolve)
        .on('error', reject)
        .save(tempFile);
    });

    // 上傳到 Google Cloud Storage
    await bucket.upload(tempFile, {
      destination: fileName,
      metadata: {
        contentType: 'audio/mpeg',
        metadata: {
          title: videoTitle,
          source: url
        }
      }
    });

    // 生成簽名 URL
    const [signedUrl] = await bucket.file(fileName).getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000 // 15 分鐘有效期
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ downloadUrl: signedUrl })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '處理請求時發生錯誤' })
    };
  }
}; 