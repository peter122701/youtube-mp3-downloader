const ytdl = require('ytdl-core');
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
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      }
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

// 測試 YouTube 連接
async function testYouTubeConnection() {
    return new Promise((resolve, reject) => {
        console.log('開始測試 YouTube 連接...');
        https.get('https://www.youtube.com', (res) => {
            console.log('YouTube 響應狀態碼:', res.statusCode);
            console.log('YouTube 響應頭:', res.headers);
            resolve({
                statusCode: res.statusCode,
                headers: res.headers
            });
        }).on('error', (err) => {
            console.error('YouTube 連接錯誤:', err);
            reject(err);
        });
    });
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Referer',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
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
    // 首先測試 YouTube 連接
    console.log('正在測試 YouTube 連接...');
    const youtubeTest = await testYouTubeConnection();
    console.log('YouTube 連接測試結果:', youtubeTest);

    // 檢查 referer
    const referer = event.headers.referer || event.headers.Referer;
    if (!referer || !referer.includes('peaceful-tarsier-993d6d.netlify.app')) {
      throw new Error('未授權的請求來源');
    }

    if (event.httpMethod !== 'POST') {
      throw new Error('只允許 POST 請求');
    }

    const { url } = JSON.parse(event.body);
    
    if (!url) {
      throw new Error('未提供 URL');
    }

    if (!ytdl.validateURL(url)) {
      throw new Error('無效的 YouTube URL');
    }

    // 獲取影片信息
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails[0].url,
        duration: info.videoDetails.lengthSeconds,
        author: info.videoDetails.author.name
      })
    };

  } catch (error) {
    console.error('處理請求時發生錯誤:', error);
    return {
      statusCode: error.message.includes('未授權') ? 403 : 500,
      headers,
      body: JSON.stringify({
        error: '處理請求時發生錯誤',
        message: error.message,
        stack: error.stack
      })
    };
  }
}; 