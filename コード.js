function doPost(e) {
  try {
    // 1. iPhoneから送られてきたデータを受け取る
    const params = JSON.parse(e.postData.contents);
    const imageBase64 = params.image;
    const myName = params.myName || "菅間"; // ショートカット側で名前が取得できなかった場合の予備
    
    // 2. Gemini APIを呼び出して名刺を解析
    // 【重要】新しく発行したAPIキーをここに貼り付けてください
    const apiKey = "AIzaSyBXQdqVcqA95HYS87QYg0n9z4QEkjNNeB0"; 
    
    // 最新の安定版モデル（Gemini 2.5 Flash）を指定
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
    
    const prompt = `
    添付された名刺画像から以下の情報を抽出し、JSON形式でのみ回答してください。
    JSONのキーは必ず以下にしてください:
    companyName (社名), industry (業種・推測でOK), contactName (担当者名), title (役職), email (メールアドレス), phone (電話番号), address (住所)
    抽出できない項目は空文字("")にしてください。
    `;

    const payload = {
      "contents": [{
        "parts": [
          {"text": prompt},
          {"inlineData": {"mimeType": "image/jpeg", "data": imageBase64}}
        ]
      }],
      "generationConfig": {"responseMimeType": "application/json"}
    };
    
    const options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload)
    };
    
    const response = UrlFetchApp.fetch(url, options);
    
    // APIからのレスポンスを解析してJSON文字列を取り出す
    const jsonStr = JSON.parse(response.getContentText()).candidates[0].content.parts[0].text;
    const data = JSON.parse(jsonStr);
    
    // 3. スプレッドシートに書き込む
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.appendRow([
      new Date(), myName, data.companyName, data.industry,
      data.contactName, data.title, data.email, data.phone, data.address
    ]);
    
    // 4. Gmailを自動送信する
    const subject = `名刺交換させていただいたお礼`;
    const body = `${data.companyName}
${data.contactName} 様

株式会社Aitane（アイタネ）の${myName}です。
名刺交換をさせていただきありがとうございます！

弊社では、議事録作成からCRM入力までをAIで完全自動化し、営業の売上を最大化する『Aitane』というシステムを提供しております。
https://aitane.co.jp/service#crm

もしよろしければ、下記より次回の情報交換の場を押さえさせていただけますと幸いです。
▼日程調整リンク（カレンダーから空き枠を選ぶだけで完了します）
https://calendar.app.google/273KmJXyh4TmJ5paA

それでは、引き続きよろしくお願いいたします！

${myName}`;
    
    if(data.email) {
      // createDraft（下書き作成）から sendEmail（直接送信）に変更しました
      GmailApp.sendEmail(data.email, subject, body);
    }
    
    return ContentService.createTextOutput("Success!");
    
  } catch(error) {
    Logger.log(error.toString()); // GASのログに記録
    return ContentService.createTextOutput("Error: " + error.toString());
  }
}
