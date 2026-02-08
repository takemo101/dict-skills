#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '../dist/crawl.js');

try {
  let content = readFileSync(distPath, 'utf-8');
  
  // #!/usr/bin/env bun を #!/usr/bin/env node に置換
  content = content.replace(/^#!\/usr\/bin\/env bun/, '#!/usr/bin/env node');
  
  // @bun コメントを削除
  content = content.replace(/^\/\/ @bun\n/m, '');
  
  writeFileSync(distPath, content, 'utf-8');
  console.log('✅ Shebang fixed: #!/usr/bin/env node');
} catch (error) {
  console.error('❌ Failed to fix shebang:', error.message);
  process.exit(1);
}
