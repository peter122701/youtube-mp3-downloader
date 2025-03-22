document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('url');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusDiv = document.getElementById('status');
    const videoInfoDiv = document.getElementById('video-info');
    const timeRangeContainer = document.getElementById('time-range-container');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');

    let videoInfo = null;

    // 顯示狀態訊息
    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? '#e74c3c' : '#2ecc71';
        console.log(`狀態更新: ${message} (${isError ? '錯誤' : '成功'})`);
    }

    // 清除影片信息
    function clearVideoInfo() {
        videoInfoDiv.innerHTML = '';
        showStatus('');
    }

    // 驗證輸入
    function validateInput(url) {
        if (!url) {
            showStatus('請輸入 YouTube 影片網址', true);
            return false;
        }
        if (!url.includes('youtube.com/watch?v=') && !url.includes('youtu.be/')) {
            showStatus('請輸入有效的 YouTube 影片網址', true);
            return false;
        }
        return true;
    }

    // 時間格式驗證
    function validateTimeFormat(time) {
        return /^([0-5][0-9]):([0-5][0-9])$/.test(time);
    }

    // 將時間轉換為秒數
    function timeToSeconds(time) {
        const [minutes, seconds] = time.split(':').map(Number);
        return minutes * 60 + seconds;
    }

    // 驗證時間範圍
    function validateTimeRange() {
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        if (!startTime || !endTime) return true;
        if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
            statusDiv.textContent = '請輸入有效的時間格式（MM:SS）';
            return false;
        }

        const startSeconds = timeToSeconds(startTime);
        const endSeconds = timeToSeconds(endTime);

        if (startSeconds >= endSeconds) {
            statusDiv.textContent = '結束時間必須大於開始時間';
            return false;
        }

        return true;
    }

    // 獲取影片資訊
    async function getVideoInfo() {
        clearVideoInfo();
        if (!validateInput(urlInput.value)) return;

        try {
            console.log('獲取影片信息:', urlInput.value);
            const response = await fetch('/.netlify/functions/info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: urlInput.value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `請求失敗 (${response.status})`);
            }

            console.log('收到的影片信息:', data);

            if (data.error) {
                throw new Error(data.error);
            }

            videoInfo = data;
            
            // 顯示影片信息
            videoInfoDiv.innerHTML = `
                <div class="video-info-container">
                    <img src="${data.thumbnail}" alt="影片縮圖" class="video-thumbnail">
                    <div class="video-details">
                        <h3>${data.title}</h3>
                        <p>作者：${data.author}</p>
                        <p>時長：${data.duration}</p>
                    </div>
                </div>
            `;

            // 顯示時間範圍選擇
            timeRangeContainer.classList.add('visible');
            showStatus('');
            downloadBtn.disabled = false;
        } catch (error) {
            console.error('獲取影片信息錯誤:', error);
            videoInfoDiv.innerHTML = '';
            showStatus(`無法獲取影片資訊: ${error.message}`, true);
            timeRangeContainer.classList.remove('visible');
            downloadBtn.disabled = true;
        }
    }

    // 處理下載
    async function handleDownload() {
        if (!validateTimeRange()) return;

        try {
            showStatus('正在處理您的請求...');
            downloadBtn.disabled = true;

            const downloadData = {
                url: urlInput.value,
                startTime: startTimeInput.value || '00:00',
                endTime: endTimeInput.value || videoInfo.duration
            };

            console.log('發送下載請求:', downloadData);
            const response = await fetch('/.netlify/functions/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(downloadData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `請求失敗 (${response.status})`);
            }

            console.log('收到的回應:', data);

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.downloadUrl) {
                // 創建一個隱藏的下載連結
                const downloadLink = document.createElement('a');
                downloadLink.href = data.downloadUrl;
                downloadLink.download = `${videoInfo.title}.mp3`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                showStatus('下載開始！');
            } else {
                throw new Error('無法獲取下載連結');
            }
        } catch (error) {
            console.error('下載錯誤:', error);
            showStatus(`錯誤：${error.message}`, true);
        } finally {
            downloadBtn.disabled = false;
        }
    }

    // 使用 debounce 函數來限制 API 調用頻率
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 事件監聽器
    const debouncedGetVideoInfo = debounce(getVideoInfo, 500);
    urlInput.addEventListener('input', debouncedGetVideoInfo);
    downloadBtn.addEventListener('click', handleDownload);

    // 當 URL 輸入框失去焦點時獲取影片信息
    urlInput.addEventListener('blur', () => {
        if (urlInput.value) {
            getVideoInfo();
        }
    });

    // 當按下 Enter 鍵時獲取影片信息
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && urlInput.value) {
            getVideoInfo();
        }
    });

    // 添加樣式
    const style = document.createElement('style');
    style.textContent = `
        .video-info-container {
            display: flex;
            align-items: start;
            gap: 20px;
            margin-top: 20px;
            padding: 15px;
            border-radius: 8px;
            background-color: #f8f9fa;
        }
        .video-thumbnail {
            width: 200px;
            border-radius: 4px;
        }
        .video-details {
            flex: 1;
        }
        .video-details h3 {
            margin: 0 0 10px 0;
            color: #1a73e8;
        }
        .video-details p {
            margin: 5px 0;
            color: #5f6368;
        }
    `;
    document.head.appendChild(style);
}); 