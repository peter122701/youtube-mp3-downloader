document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('url');
    const startTimeInput = document.getElementById('start_time');
    const endTimeInput = document.getElementById('end_time');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusDiv = document.getElementById('status');
    const videoInfoDiv = document.getElementById('video-info');

    // YouTube API endpoint
    const API_ENDPOINT = 'https://your-serverless-function-url.netlify.app/.netlify/functions/download';

    // 驗證時間格式
    function isValidTimeFormat(time) {
        return /^([0-9]{2}):([0-9]{2}):([0-9]{2})$/.test(time);
    }

    // 顯示狀態訊息
    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? '#e74c3c' : '#2ecc71';
    }

    // 驗證輸入
    function validateInputs() {
        if (!urlInput.value) {
            showStatus('請輸入 YouTube 影片網址', true);
            return false;
        }

        if (!isValidTimeFormat(startTimeInput.value) || !isValidTimeFormat(endTimeInput.value)) {
            showStatus('請輸入正確的時間格式 (HH:MM:SS)', true);
            return false;
        }

        return true;
    }

    // 處理下載
    async function handleDownload() {
        if (!validateInputs()) return;

        try {
            showStatus('正在處理您的請求...');
            downloadBtn.disabled = true;

            const response = await axios.post(API_ENDPOINT, {
                url: urlInput.value,
                startTime: startTimeInput.value,
                endTime: endTimeInput.value
            });

            if (response.data.downloadUrl) {
                window.location.href = response.data.downloadUrl;
                showStatus('下載開始！');
            } else {
                throw new Error('下載連結無效');
            }
        } catch (error) {
            showStatus(`錯誤：${error.message}`, true);
        } finally {
            downloadBtn.disabled = false;
        }
    }

    // 事件監聽器
    downloadBtn.addEventListener('click', handleDownload);

    // 當 URL 輸入改變時獲取影片資訊
    urlInput.addEventListener('blur', async () => {
        if (!urlInput.value) return;

        try {
            const response = await axios.post(`${API_ENDPOINT}/info`, {
                url: urlInput.value
            });

            const { title, duration } = response.data;
            videoInfoDiv.innerHTML = `
                <h3>影片資訊：</h3>
                <p>標題：${title}</p>
                <p>時長：${duration}</p>
            `;

            startTimeInput.value = '00:00:00';
            endTimeInput.value = duration;
        } catch (error) {
            videoInfoDiv.innerHTML = '';
            showStatus('無法獲取影片資訊', true);
        }
    });
}); 