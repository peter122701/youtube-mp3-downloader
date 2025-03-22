const https = require('https');

// 從 URL 中提取視頻 ID
function extractVideoId(url) {
  const regex = /[?&]v=([^&]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// 調用 YouTube API
async function getVideoInfo(videoId, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.googleapis.com',
      path: `/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(response.error.message));
          } else if (!response.items || response.items.length === 0) {
            reject(new Error('找不到影片'));
          } else {
            resolve(response);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// 將 ISO 8601 時長轉換為秒數
function parseDuration(duration) {
  const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = parseInt(matches[1] || 0);
  const minutes = parseInt(matches[2] || 0);
  const seconds = parseInt(matches[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

exports.handler = async function(event, context) {
  // 添加 CORS 標頭
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 處理 OPTIONS 請求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('收到請求:', { 
      httpMethod: event.httpMethod,
      body: event.body,
      headers: event.headers 
    });

    if (event.httpMethod !== 'POST') {
      throw new Error('只允許 POST 請求');
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(event.body);
      console.log('解析的請求體:', parsedBody);
    } catch (e) {
      throw new Error('無效的 JSON 格式: ' + e.message);
    }

    const { url } = parsedBody;
    
    if (!url) {
      throw new Error('未提供 URL');
    }

    console.log('處理 URL:', url);

    // 提取視頻 ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('無效的 YouTube URL');
    }

    // 從環境變量獲取 API 密鑰
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('未設置 YouTube API 密鑰');
    }

    console.log('開始獲取影片信息...');

    // 獲取影片信息
    const youtubeResponse = await getVideoInfo(videoId, apiKey);
    const videoData = youtubeResponse.items[0];

    console.log('成功獲取影片信息');

    // 構建響應
    const response = {
      title: videoData.snippet.title,
      duration: new Date(parseDuration(videoData.contentDetails.duration) * 1000).toISOString().substr(11, 8),
      thumbnail: videoData.snippet.thumbnails.default.url,
      author: videoData.snippet.channelTitle
    };

    console.log('準備返回的響應:', response);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('詳細錯誤信息:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });

    // 根據錯誤類型返回不同的狀態碼
    const statusCode = error.message.includes('無效') ? 400 : 500;

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: '處理請求時發生錯誤',
        message: error.message,
        type: error.name,
        code: error.code
      })
    };
  }
}; 