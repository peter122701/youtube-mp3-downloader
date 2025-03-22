document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('url');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusDiv = document.getElementById('status');
    const videoInfoDiv = document.getElementById('video-info');

    // 顯示狀態訊息
    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? '#e74c3c' : '#2ecc71';
        console.log(`狀態更新: ${message} (${isError ? '錯誤' : '成功'})`);
    }

    // 驗證輸入
    function validateInputs() {
        if (!urlInput.value) {
            showStatus('請輸入 YouTube 影片網址', true);
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

            console.log('發送下載請求:', urlInput.value);
            const response = await fetch('/.netlify/functions/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: urlInput.value
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('收到的回應:', data);

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.downloadUrl) {
                // 創建一個隱藏的下載連結
                const downloadLink = document.createElement('a');
                downloadLink.href = data.downloadUrl;
                downloadLink.download = `${data.title}.${data.format}`;
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

    // 當 URL 輸入改變時獲取影片資訊
    async function getVideoInfo() {
        if (!urlInput.value) return;

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

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('收到的影片信息:', data);

            if (data.error) {
                throw new Error(data.error);
            }

            videoInfoDiv.innerHTML = `
                <h3>影片資訊：</h3>
                <p>標題：${data.title}</p>
                <p>時長：${data.duration}</p>
                <img src="${data.thumbnail}" alt="影片縮圖" style="max-width: 200px;">
            `;
        } catch (error) {
            console.error('獲取影片信息錯誤:', error);
            videoInfoDiv.innerHTML = '';
            showStatus(`無法獲取影片資訊: ${error.message}`, true);
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
}); 