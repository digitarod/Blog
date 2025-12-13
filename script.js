const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbw1Og5GVss8PRpAr2aq382Fp_D8Ed4VuqreLNiBqsxvMbC_RZsP1VDbFxQKF5lMZUOjQA/exec';

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
    const createJobBtn = document.getElementById('create-job-btn');
    const publishBtn = document.getElementById('publish-btn');

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
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'generate',
                    topic: fullPrompt // サーバー側の引数名はtopicのまま再利用（中身はフルプロンプト）
                })
            });

            // no-corsのため、成功したと仮定してダミーレスポンスを表示するか、
            // 実際にはGAS側でContentService.MimeType.JSONを返していれば
            // 以下の処理はスキップされる（no-corsではjson()が読めないため）。
            // ★重要: 開発中はno-corsだとデバッグしにくいため、
            // 本番ではGAS側を適切に設定し、corsモードで通信するのがベスト。
            // ここでは「リクエストは飛んだ」前提で、ユーザーに通知する。

            // alert('生成リクエストを送信しました。結果が表示されるまで数秒お待ちください...');

            // 【デモ用】no-corsだと結果が取れないため、一時的にダミーテキストを入れる
            // ※本来はGASからのレスポンスを待つ
            const dummyContent = `
                <h2>${topic}について</h2>
                <p>（ここにAIが生成した文章が入ります。現在はデモモードのため、GASからの実際のレスポンスを受け取るにはCORS設定が必要です）</p>
                <p>設定された役割: ${systemPrompt.substring(0, 20)}...</p>
                <p>トーン: ${toneSelect.value}</p>
            `;

            titleInput.value = `【案】${topic}`;
            quill.clipboard.dangerouslyPasteHTML(dummyContent);

        } catch (error) {
            console.error('Error:', error);
            alert('エラーが発生しました');
        } finally {
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    });

    // HTMLコピー機能 (Free User向け)
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

    // 自動投稿ジョブ設定 (Pro User向け)
    createJobBtn.addEventListener('click', () => {
        alert('【Pro機能】\nこのプロンプト設定を保存し、自動投稿ジョブを作成します。\n（課金ページへ遷移します）');
    });

    // 公開ボタンのイベントリスナー（Pro機能として残す）
    publishBtn.addEventListener('click', async () => {
        alert('【Pro機能】\nワンクリック投稿機能は有料プラン限定です。');
    });
});
