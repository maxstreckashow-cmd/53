// passenger_app.js
try {
  require('./dist/server.cjs');
} catch (e) {
  const http = require('http');
  http.createServer((req, res) => {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Настройка моста фидов Domoplaner → Tilda</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
              padding: 40px 20px; 
              background: #f4f6f8; 
              color: #2D3748; 
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 80vh;
            }
            .card { 
              max-width: 650px; 
              width: 100%;
              background: white; 
              padding: 40px; 
              border-radius: 16px; 
              box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); 
              border: 1px solid #E2E8F0; 
            }
            h1 { 
              color: #DD6B20; 
              font-size: 22px; 
              margin-top: 0; 
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            p {
              line-height: 1.6;
              color: #4A5568;
              font-size: 15px;
            }
            code { 
              background: #EDF2F7; 
              color: #2D3748;
              padding: 14px; 
              display: block; 
              border-radius: 8px; 
              overflow-x: auto; 
              font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; 
              border: 1px solid #CBD5E0; 
              margin: 15px 0; 
              font-size: 14px;
            }
            ol { 
              padding-left: 20px; 
              line-height: 1.8; 
              font-size: 15px;
              color: #4A5568;
            }
            ol li {
              margin-bottom: 12px;
            }
            .btn {
              display: inline-block;
              background: #3182CE;
              color: white;
              padding: 10px 20px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 500;
              margin-top: 15px;
              transition: background 0.2s;
            }
            .btn:hover {
              background: #2B6CB0;
            }
            .tech-err { 
              color: #A0AEC0; 
              font-size: 12px; 
              margin-top: 30px; 
              border-top: 1px solid #E2E8F0; 
              padding-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>⚠️ Проект распакован, но еще не запущен</h1>
            <p>Вы успешно загрузили файлы моста в Beget. Теперь осталось выполнить простую процедуру сборки, чтобы скомпилировать проект под запуск на вашем хостинге.</p>
            
            <h3>Что нужно сделать (всего 2 простых шага):</h3>
            <ol>
              <li>
                <strong>Шаг 1. Откройте Терминал:</strong><br>
                В панели управления Beget найдите и откройте раздел <strong>«Терминал»</strong> (в левом боковом меню) — это встроенная безопасная командная строка.
              </li>
              <li>
                <strong>Шаг 2. Выполните сборку:</strong><br>
                Скопируйте и вставьте в Терминал следующую команду, после чего нажмите <strong>Enter</strong>:
                <code>cd ~/ваш_домен/public_html && npm install && npm run build</code>
                <small style="color: #718096; display: block; margin-top: -5px;">* Вместо <code>ваш_домен</code> укажите название папки вашего сайта в Beget (например, <code>my-subdomain.beget.tech</code>).</small>
              </li>
            </ol>
            
            <p>Как только команда завершится, просто обновите эту страницу в браузере. Мост автоматически запустится и покажет полноценный интерфейс!</p>
            
            <a href="javascript:window.location.reload();" class="btn">🔄 Обновить страницу</a>
            
            <div class="tech-err">
              Подробности отсутствия сборки (техническая отладка): ${e.message}
            </div>
          </div>
        </body>
      </html>
    `);
  }).listen(process.env.PORT || 3000);
}
