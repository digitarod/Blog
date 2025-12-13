const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwVdp8jXaUpK0kRaJygS_iPpWDivXBOwD2B9E49LIHo6MxNtQnvrQVTlrtNDzdZ35oj/exec';

document.addEventListener('DOMContentLoaded', () => {
    // Quillエディタの初期化
    const quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'image'],
                ['clean']
            ]
        },
        placeholder: 'ここに素晴らしい記事を書きましょう...'
    });

    // 要素の取得
    const generateBtn = document.getElementById('generate-btn');
    const systemPromptInput = document.getElementById('system-prompt');
    const topicInput = document.getElementById('topic-input');
    const lengthSelect = document.getElementById('length-select');
    const toneSelect = document.getElementById('tone-select');

    const titleInput = document.getElementById('post-title');
    const copyHtmlBtn = document.getElementById('copy-html-btn');

    // AI生成ボタンのイベントリスナー
    generateBtn.addEventListener('click', async () => {
        const topic = topicInput.value.trim();
        const systemPrompt = systemPromptInput.value.trim();

        if (!topic) {
            alert('テーマを入力してください');
            return;
        }

        // ローディング状態の表示
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<span class="sparkle">⏳</span> 生成中...';
        generateBtn.disabled = true;

        try {
            // プロンプトの組み立て
            const fullPrompt = `
${systemPrompt}

【条件】
- テーマ: ${topic}
- 文字数目安: ${lengthSelect.options[lengthSelect.selectedIndex].text}
- トーン: ${toneSelect.options[toneSelect.selectedIndex].text}
            `;

            // GAS APIを呼び出す
            // mode: 'cors' (デフォルト) でリクエストすることで、GASからのJSONレスポンスを受け取れます。
            // ※GAS側で setMimeType(ContentService.MimeType.JSON) されている必要があります。
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8', // GASのPOSTはtext/plainが安定します
                },
                body: JSON.stringify({
                    action: 'generate',
                    topic: fullPrompt // サーバー側の引数名はtopicのまま再利用（中身はフルプロンプト）
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // 生成成功：AIが書いた記事をエディタに反映
                titleInput.value = `【案】${topic}`;
                quill.clipboard.dangerouslyPasteHTML(result.content);
            } else {
                throw new Error(result.error || '生成に失敗しました（GAS側でエラーが発生）');
            }

        } catch (error) {
            console.error('Error:', error);
            alert(`エラーが発生しました:\n${error.message}\n\n※GASのデプロイが「新バージョン」で更新されているか確認してください。`);
        } finally {
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    });

    // HTMLコピー機能
    copyHtmlBtn.addEventListener('click', () => {
        const html = quill.root.innerHTML;
        navigator.clipboard.writeText(html).then(() => {
            const originalText = copyHtmlBtn.innerHTML;
            copyHtmlBtn.innerHTML = '<span class="icon">✅</span> コピー完了';
            setTimeout(() => {
                copyHtmlBtn.innerHTML = originalText;
            }, 2000);
        });
    });
});
