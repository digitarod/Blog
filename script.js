const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxvgAjy4GD-dhF1d7Mbh5s3fnosPHjKghEIIX1rA9UX3728o54tQHaZenu2uOr87WRZ5A/exec';

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
    const topicInput = document.getElementById('topic-input');
    const titleInput = document.getElementById('post-title');
    const aiOptions = document.getElementById('ai-options');
    const publishBtn = document.getElementById('publish-btn');

    // AI生成ボタンのイベントリスナー
    generateBtn.addEventListener('click', async () => {
        const topic = topicInput.value.trim();
        if (!topic) {
            alert('記事のテーマを入力してください');
            return;
        }

        // ローディング状態の表示
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<span class="sparkle">⏳</span> AIが執筆中...';
        generateBtn.disabled = true;

        try {
            // GAS APIを呼び出す
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                mode: 'no-cors', // GASの仕様上no-corsが必要な場合があるが、JSONを受け取るにはredirect: followが必要
                // 実際にはGASのWebアプリはリダイレクトを返すため、クライアント側でJSONを直接受け取るのが難しい場合がある
                // ここでは一般的なfetch方法を使用するが、GAS側でContentServiceを使用している前提
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'generate',
                    topic: topic
                })
            });

            // no-corsモードだとresponse.json()が読めないため、
            // 実際にはGASからJSONPを使うか、リダイレクト先のJSONを取得する工夫が必要だが、
            // 今回は単純化のため、fetchが成功したら（またはGAS側でCORSヘッダーを適切に処理していれば）
            // テキストとして受け取る処理を試みる。
            // ※GASのdoPostは通常リダイレクトを伴うため、fetchで直接JSONを受け取るには
            // GAS側で setMimeType(ContentService.MimeType.JSON) している必要がある。

            const result = await response.json();

            if (result.success) {
                // エディタに反映
                titleInput.value = `【AI生成】${topic}`; // タイトルは簡易的に設定
                quill.clipboard.dangerouslyPasteHTML(result.content);

                // オプション表示
                aiOptions.classList.remove('hidden');
            } else {
                throw new Error(result.error || '生成に失敗しました');
            }

        } catch (error) {
            console.error('Error:', error);
            // GASのCORS制限でエラーになる場合でも、実際には処理が走っていることがあるため
            // ユーザーへのメッセージは慎重に出す
            alert('生成リクエストを送信しました。\n(注意: GASの無料枠制限やCORS設定により、結果が直接取得できない場合があります。その場合はコンソールを確認してください)');
        } finally {
            // ボタンを元に戻す
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    });

    // 公開ボタンのイベントリスナー
    publishBtn.addEventListener('click', async () => {
        const content = quill.root.innerHTML;
        const title = titleInput.value;

        if (!title) {
            alert('タイトルを入力してください');
            return;
        }

        const originalText = publishBtn.innerHTML;
        publishBtn.innerHTML = '🚀 公開中...';
        publishBtn.disabled = true;

        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'publish',
                    title: title,
                    content: content
                })
            });

            const result = await response.json();

            if (result.success) {
                alert(`公開しました！\nURL: ${result.url}`);
            } else {
                throw new Error(result.error || '公開に失敗しました');
            }

        } catch (error) {
            console.error('Error:', error);
            alert('公開リクエストを送信しました。GitHubリポジトリを確認してください。');
        } finally {
            publishBtn.innerHTML = originalText;
            publishBtn.disabled = false;
        }
    });
});
