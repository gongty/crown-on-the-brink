import type {Scalar} from './schema';
// No eval: a tiny recursive-descent grammar. Unknown paths are errors, never globals.
export function evaluate(source:string|undefined, read:(path:string)=>Scalar):boolean {
 if(!source)return true;
 const token=/\s*(>=|<=|==|!=|&&|\|\||[!()<>]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?|[\p{L}_][\p{L}\p{N}_.]*)/uy;
 const ts:string[]=[];let at=0;
 while(at<source.length){if(!source.slice(at).trim())break;token.lastIndex=at;const m=token.exec(source);if(!m)throw Error(`条件非法：${source.slice(at)}`);ts.push(m[1]);at=token.lastIndex;}
 let i=0;
 const atom=():Scalar=>{const t=ts[i++];if(!t)throw Error('条件缺少值');if(t==='!')return !atom();if(t==='('){const v=or();if(ts[i++]!==')')throw Error('条件缺少右括号');return v;}if(t==='true'||t==='false')return t==='true';if(/^[-\d]/.test(t))return Number(t);if(t[0]==='"')return JSON.parse(t);if(t[0]==="'")return t.slice(1,-1).replace(/\\'/g,"'");if(/[()<>!=&|]/.test(t))throw Error('条件值非法');return read(t);};
 const cmp=():Scalar=>{const a=atom();const op=ts[i];if(!['==','!=','>','>=','<','<='].includes(op))return a;i++;const b=atom();switch(op){case '==':return a===b;case '!=':return a!==b;case '>':return a>b;case '<':return a<b;case '>=':return a>=b;default:return a<=b;}};
 const and=():Scalar=>{let a=cmp();while(ts[i]==='&&'){i++;const b=cmp();a=Boolean(a)&&Boolean(b);}return a;};
 const or=():Scalar=>{let a=and();while(ts[i]==='||'){i++;const b=and();a=Boolean(a)||Boolean(b);}return a;};
 const result=or();if(i!==ts.length)throw Error('条件存在多余内容');return Boolean(result);
}
export const conditionPaths=(s:string)=>[...s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,'').matchAll(/[\p{L}_][\p{L}\p{N}_.]*/gu)].map(x=>x[0]).filter(x=>!['true','false'].includes(x));
