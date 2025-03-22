document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('url');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusDiv = document.getElementById('status');
    const videoInfoDiv = document.getElementById('video-info');

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
        return true;
    }

    // 處理下載
    async function handleDownload() {
        if (!validateInputs()) return;

        try {
            showStatus('正在處理您的請求...');
            downloadBtn.disabled = true;

            const response = await fetch('/.netlify/functions/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: urlInput.value
                })
            });

            const data = await response.json();

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
            showStatus(`錯誤：${error.message}`, true);
        } finally {
            downloadBtn.disabled = false;
        }
    }

    // 當 URL 輸入改變時獲取影片資訊
    urlInput.addEventListener('blur', async () => {
        if (!urlInput.value) return;

        try {
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
            videoInfoDiv.innerHTML = '';
            showStatus('無法獲取影片資訊', true);
        }
    });

    // 事件監聽器
    downloadBtn.addEventListener('click', handleDownload);
}); 