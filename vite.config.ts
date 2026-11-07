import {defineConfig} from 'vite';
import {cleanReleaseAssets} from './tools/release-assets';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:'./',plugins:[{name:'clean-published-assets',closeBundle(){cleanReleaseAssets(fileURLToPath(new URL('.',import.meta.url)));}}],publicDir:'src/public',server:{watch:{ignored:['**/src/generated/**','**/src/public/**','**/docs/**','**/content/**','**/assets/**']}},build:{target:'es2020',manifest:true}});
