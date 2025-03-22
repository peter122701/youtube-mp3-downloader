const ytdl = require('ytdl-core');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Referer',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('開始處理請求...');
    
    if (event.httpMethod !== 'POST') {
      throw new Error('只允許 POST 請求');
    }

    const { url } = JSON.parse(event.body);
    console.log('收到的 URL:', url);
    
    if (!url) {
      throw new Error('未提供 URL');
    }

    if (!ytdl.validateURL(url)) {
      throw new Error('無效的 YouTube URL');
    }

    console.log('開始獲取影片信息...');
    const basicInfo = await ytdl.getBasicInfo(url);
    console.log('成功獲取基本信息');

    const videoDetails = {
      title: basicInfo.videoDetails.title,
      thumbnail: basicInfo.videoDetails.thumbnails[0].url,
      duration: basicInfo.videoDetails.lengthSeconds,
      author: basicInfo.videoDetails.author.name
    };

    console.log('準備返回的影片信息:', videoDetails);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(videoDetails)
    };

  } catch (error) {
    console.error('處理請求時發生錯誤:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '處理請求時發生錯誤',
        message: error.message,
        details: error.name
      })
    };
  }
}; 