from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<OPENROUTER_API_KEY>",
)

# 会話履歴を含む場合の正しい形式
completion = client.chat.completions.create(
    extra_headers={
        "HTTP-Referer": "<YOUR_SITE_URL>",  # Optional. Site URL for rankings on openrouter.ai.
        "X-Title": "<YOUR_SITE_NAME>",  # Optional. Site title for rankings on openrouter.ai.
    },
    model="perplexity/sonar",
    messages=[
        {
            "role": "user",
            "content": "こんにちはとは何ですか？"
        },
        {
            "role": "assistant",
            "content": "「こんにちは」は、日本語で昼間に使う代表的な挨拶です。\n"
            + "\n"
            + "### 基本情報\n"
            + "\n"
            + "- **意味**：主に昼間に人に対して使う挨拶。英語では「Hello」や「Hi」にあたります。\n"
            + "- **使用時間帯**：一般的には午前 10 時～午後 5 時ごろまで。早朝や夜には「おはようございます」「こんばんは」を使います。\n"
            + "\n"
            + "---\n"
            + "\n"
            + "### 表記と発音\n"
            + "\n"
            + "- **正しい表記**：「こんにちは」\n"
            + "- **発音**：「こんにちわ」と発音されることが多いですが、**正しい書き方は「こんにちは」**です。\n"
            + "- **理由**：「こんにちは」は「今日は（いい天気ですね）」などの省略形で、「は」は助詞（は）なので、「わ」と書くのは誤りです。公式な場やビジネスでは「こんにちは」を使いましょう。\n"
            + "\n"
            + "---\n"
            + "\n"
            + "### 英語での挨拶\n"
            + "\n"
            + "- **Hello**：フォーマル・カジュアル両方で使える一般的な挨拶。\n"
            + "- **Hi**：友人や親しい人とのカジュアルな挨拶。\n"
            + "\n"
            + "---\n"
            + "\n"
            + "### まとめ\n"
            + "\n"
            + "- 「こんにちは」は昼間の挨拶。\n"
            + "- 正しい書き方は「こんにちは」。\n"
            + "- 英語では「Hello」や「Hi」。\n"
            + "- 公式な場では正しい表記を守りましょう。\n"
            + "\n"
            + "---\n"
            + "\n"
            + "参考：Weblio 和英辞書、国立国語研究所、ウィクショナリー日本語版"
        },
        {
            "role": "user",
            "content": "画像に何が写っていますか？"  # 画像を含む場合は、contentを配列にして画像データを含める
        }
    ],
)

print(completion.choices[0].message.content)

# 画像を含む場合の例（base64エンコードされた画像を使用）
# completion_with_image = client.chat.completions.create(
#     extra_headers={
#         "HTTP-Referer": "<YOUR_SITE_URL>",
#         "X-Title": "<YOUR_SITE_NAME>",
#     },
#     model="perplexity/sonar",
#     messages=[
#         {
#             "role": "user",
#             "content": [
#                 {"type": "text", "text": "この画像には何が写っていますか？"},
#                 {
#                     "type": "image_url",
#                     "image_url": {
#                         "url": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."  # base64エンコードされた画像データ
#                     }
#                 }
#             ]
#         }
#     ],
# )
