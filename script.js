document.addEventListener('DOMContentLoaded', () => {
    // Quillエディタの初期化
    const quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
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
        generateBtn.innerHTML = '<span class="sparkle">⏳</span> 生成中...';
        generateBtn.disabled = true;

        try {
            // ここで将来的にGASのAPIを呼び出す
            // 今回はダミーの遅延と生成テキストを使用
            await new Promise(resolve => setTimeout(resolve, 2000));

            // ダミーの生成結果
            const dummyTitle = `【AI生成】${topic}について知っておくべき3つのこと`;
            const dummyContent = `
                <h2>はじめに</h2>
                <p>${topic}は現在、非常に注目されているトピックです。この記事では、その重要性と未来について解説します。</p>
                <h2>1. 現状の課題</h2>
                <p>多くの人々が${topic}に関心を持っていますが、正しい理解はまだ浸透していません。</p>
                <h2>2. 解決策としてのAI</h2>
                <p>AI技術を活用することで、${topic}に関する課題を効率的に解決できる可能性があります。</p>
                <h2>まとめ</h2>
                <p>今後の${topic}の動向に注目していく必要があります。</p>
            `;

            // エディタに反映
            titleInput.value = dummyTitle;
            quill.clipboard.dangerouslyPasteHTML(dummyContent);
            
            // オプション表示
            aiOptions.classList.remove('hidden');

        } catch (error) {
            console.error('Error:', error);
            alert('生成中にエラーが発生しました');
        } finally {
            // ボタンを元に戻す
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    });

    // 公開ボタンのイベントリスナー（将来の拡張用）
    publishBtn.addEventListener('click', () => {
        const content = quill.root.innerHTML;
        const title = titleInput.value;
        const isSeoMode = document.getElementById('seo-mode').checked;
        const isAutoImage = document.getElementById('auto-image').checked;

        console.log('Publishing...', {
            title,
            content,
            settings: {
                seo: isSeoMode,
                autoImage: isAutoImage
            }
        });

        alert('公開機能は準備中です。\nGASと連携してGitHubへのPushやWordPressへの投稿を行います。');
    });
});
