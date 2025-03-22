const ytdl = require('ytdl-core');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: '只允許 POST 請求' })
    };
  }

  try {
    const { url } = JSON.parse(event.body);

    // 驗證 YouTube URL
    if (!ytdl.validateURL(url)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '無效的 YouTube URL' })
      };
    }

    // 獲取影片信息
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

    // 獲取音訊直接下載連結
    const audioUrl = format.url;

    return {
      statusCode: 200,
      body: JSON.stringify({
        downloadUrl: audioUrl,
        title: info.videoDetails.title,
        format: format.container
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '處理請求時發生錯誤' })
    };
  }
}; 