import * as fs from 'fs'
import * as path from 'path'
import { r2Delete, r2ListFolder, r2Put } from '../src/lib/r2'

const envPath = path.resolve(process.cwd(), '.env.local')
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const [key, ...vals] = line.split('=')
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
}

async function main() {
  const key = '_connection-test.txt'
  await r2Put(key, Buffer.from('ok'), 'text/plain')
  await r2Delete(key)
  const files = await r2ListFolder('products')
  console.log('✅ R2 conectado — bucket:', process.env.R2_BUCKET_NAME)
  console.log('   URL pública:', process.env.NEXT_PUBLIC_R2_PUBLIC_URL)
  console.log('   Archivos en products/:', files.length, '(antes de migrar)')
}

main().catch((e) => {
  console.error('❌ R2 falló:', e.message ?? e)
  process.exit(1)
})
