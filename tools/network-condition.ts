export function networkCondition(source:string){
 const re=/\s*(seen\s*\(\s*(?:"[^"\\]*"|'[^'\\]*')\s*\)|>=|<=|==|!=|[()<>]|-?\d+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[A-Za-z_][A-Za-z_0-9]*)/gy;let at=0;const out:string[]=[];
 while(at<source.length){if(!source.slice(at).trim())break;re.lastIndex=at;const m=re.exec(source);if(!m)throw Error('未支持的设计条件：'+source.slice(at));at=re.lastIndex;const token=m[1];if(token.startsWith('seen')){const id=token.match(/['"]([^'"]+)['"]/)?.[1];if(!id||!/^[A-Za-z_0-9]+$/.test(id))throw Error('非法seen目标');out.push('visited.'+id);}else out.push(({and:'&&',or:'||',not:'!',True:'true',False:'false'} as Record<string,string>)[token]||token);
 }
 return out.join(' ');
}
