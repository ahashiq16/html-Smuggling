const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let currentPath = process.cwd();

//A function to generate a secure key from a password using PBKDF2

function deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

// Function to create a standalone HTML Smuggler file by encrypting a file
function createSmuggledHtml(filePath, password) {
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    // 1. create Random Salt & IV
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);

   // 2. Generating an encryption key and encrypting using AES-256-GCM
    const key = deriveKey(password, salt);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const encryptedData = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // 3. Convert all data to a hex string
    const payload = {
        fileName: fileName,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        data: encryptedData.toString('hex')
    };

    // 4. Standalone HTML Template (For decryption in the browser)
    const htmlContent = `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Protected File Download</title>
    <style>
        * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 100%; max-width: 420px; text-align: center; border: 1px solid #334155; }
        h2 { margin-top: 0; color: #38bdf8; font-size: 1.5rem; }
        p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
        input { width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #fff; font-size: 1rem; margin-bottom: 1rem; outline: none; }
        input:focus { border-color: #38bdf8; }
        button { width: 100%; padding: 12px; border: none; border-radius: 6px; background: #0284c7; color: white; font-size: 1rem; font-weight: bold; cursor: pointer; transition: 0.2s; }
        button:hover { background: #0369a1; }
        .error { color: #f87171; margin-top: 1rem; font-size: 0.85rem; display: none; }
    </style>
</head>
<body>
    <div class="card">
        <h2>🔒 Encrypted File</h2>
        <p>File: <strong>${payload.fileName}</strong></p>
        <input type="password" id="pass" placeholder="Enter Password..." autofocus />
        <button onclick="decryptAndDownload()">Decrypt & Download</button>
        <div id="error" class="error">❌ Incorrect Password or Corrupted File!</div>
    </div>

    <script>
        const payload = ${JSON.stringify(payload)};

        function hexToBuf(hex) {
            const bytes = new Uint8Array(hex.length / 2);
            for (let i = 0; i < hex.length; i += 2) {
                bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
            }
            return bytes;
        }

        async function decryptAndDownload() {
            const password = document.getElementById('pass').value;
            const errorDiv = document.getElementById('error');
            errorDiv.style.display = 'none';

            if (!password) return;

            try {
                const enc = new TextEncoder();
                const passKey = await window.crypto.subtle.importKey(
                    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
                );

                const key = await window.crypto.subtle.deriveKey(
                    {
                        name: 'PBKDF2',
                        salt: hexToBuf(payload.salt),
                        iterations: 100000,
                        hash: 'SHA-256'
                    },
                    passKey,
                    { name: 'AES-GCM', length: 256 },
                    false,
                    ['decrypt']
                );

                const cipherText = hexToBuf(payload.data);
                const authTag = hexToBuf(payload.authTag);

                const encryptedBuffer = new Uint8Array(cipherText.length + authTag.length);
                encryptedBuffer.set(cipherText);
                encryptedBuffer.set(authTag, cipherText.length);

                const decrypted = await window.crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv: hexToBuf(payload.iv) },
                    key,
                    encryptedBuffer
                );

                const blob = new Blob([decrypted]);
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = payload.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

            } catch (err) {
                errorDiv.style.display = 'block';
            }
        }
    </script>
</body>
</html>`;

    const outputFileName = `${fileName}_secure.html`;
    const outputPath = path.join(path.dirname(filePath), outputFileName);
    fs.writeFileSync(outputPath, htmlContent, 'utf8');
    console.log(`\n✅ Successful! Encrypted HTML file created: ${outputFileName}`);
}

const originalLog = console.log;
console.log = function (...args) {
  // \x1b[32m = Green, \x1b[0m = Reset
  originalLog('\x1b[32m' + args.join(' ') + '\x1b[0m');
};

// Main Terminal Explorer
function startExplorer() {
    console.log('\n=========================================');
    console.log('=================ASHIQ===================');
    console.log('=============HTML-SMUGGLER===============');
    console.log('=========================================');
    console.log('Current Path:', currentPath);

    try {
        const items = fs.readdirSync(currentPath, { withFileTypes: true });

        items.forEach((item, index) => {
            const type = item.isDirectory() ? '📁 [FOLDER]' : '📄 [FILE]';
            console.log(`${index + 1}. ${type} ${item.name}`);
        });

        console.log('\n[Command: type Item lists Number OR Name | ".." (Back) | "exit" (Close)]');

        rl.question('\nwhat you want? ', (answer) => {
            const trimmedAnswer = answer.trim();

            if (trimmedAnswer.toLowerCase() === 'exit') {
                console.log('Explorer has been closed!');
                rl.close();
                return;
            }

            if (trimmedAnswer === '..') {
                currentPath = path.dirname(currentPath);
                startExplorer();
                return;
            }

            let selectedItem = null;
            const itemIndex = parseInt(trimmedAnswer) - 1;

            if (!isNaN(itemIndex) && itemIndex >= 0 && itemIndex < items.length) {
                selectedItem = items[itemIndex];
            } else {
                selectedItem = items.find(i => i.name.toLowerCase() === trimmedAnswer.toLowerCase());
            }

            if (selectedItem) {
                const targetPath = path.join(currentPath, selectedItem.name);

                if (selectedItem.isDirectory()) {
                    currentPath = targetPath;
                    startExplorer();
                } else {
                    rl.question(`\n🔑 "${selectedItem.name}" Create a password: `, (password) => {
                        if (password.trim() === '') {
                            console.log('❌ The password cannot be left blank!');
                        } else {
                            createSmuggledHtml(targetPath, password.trim());
                        }
                        startExplorer();
                    });
                }
            } else {
                console.log('❌ Provide the correct number or name! Try to go.');
                startExplorer();
            }
        });

    } catch (err) {
        console.log('❌ An error has occurred:', err.message);
        rl.close();
    }
}

// Program start
startExplorer();