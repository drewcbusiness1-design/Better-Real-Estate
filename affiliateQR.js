// Fixed Version 5-L byte-mode QR. Local deterministic encoding, no provider/dependency.
function qrSVG(text){
 const bytes=Buffer.from(String(text),'utf8');if(bytes.length>106)throw new Error('Affiliate link is too long for this QR code.');
 const bits=[];const put=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push((v>>>i)&1)};put(4,4);put(bytes.length,8);for(const b of bytes)put(b,8);for(let i=0;i<4&&bits.length<864;i++)bits.push(0);while(bits.length%8)bits.push(0);
 const data=[];for(let i=0;i<bits.length;i+=8)data.push(bits.slice(i,i+8).reduce((a,b)=>(a<<1)|b,0));let pad=0;while(data.length<108)data.push(pad++%2===0?0xec:0x11);
 const mul=(a,b)=>{let r=0;while(b){if(b&1)r^=a;a<<=1;if(a&256)a^=0x11d;b>>=1;}return r;};
 let generator=[1],root=1;for(let i=0;i<26;i++){const next=Array(generator.length+1).fill(0);for(let j=0;j<generator.length;j++){next[j]^=generator[j];next[j+1]^=mul(generator[j],root);}generator=next;root=mul(root,2);}
 const remainder=data.concat(Array(26).fill(0));for(let i=0;i<data.length;i++){const factor=remainder[i];for(let j=0;j<generator.length;j++)remainder[i+j]^=mul(generator[j],factor);}
 const codewords=data.concat(remainder.slice(-26)),size=37,m=Array.from({length:size},()=>Array(size).fill(false)),reserved=m.map(r=>r.map(()=>false));
 const set=(x,y,v)=>{if(x<0||y<0||x>=size||y>=size)return;m[y][x]=!!v;reserved[y][x]=true;};
 for(const [cx,cy]of [[3,3],[size-4,3],[3,size-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy));set(cx+dx,cy+dy,d!==2&&d!==4);}
 for(let i=8;i<size-8;i++){set(i,6,i%2===0);set(6,i,i%2===0);}
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(30+dx,30+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);
 const formatData=8;let formatRem=formatData;for(let i=0;i<10;i++)formatRem=(formatRem<<1)^((formatRem>>>9)*0x537);const format=((formatData<<10)|formatRem)^0x5412;const fbit=i=>(format>>>i)&1;
 for(let i=0;i<=5;i++)set(8,i,fbit(i));set(8,7,fbit(6));set(8,8,fbit(7));set(7,8,fbit(8));for(let i=9;i<15;i++)set(14-i,8,fbit(i));
 for(let i=0;i<8;i++)set(size-1-i,8,fbit(i));for(let i=8;i<15;i++)set(8,size-15+i,fbit(i));set(8,size-8,true);
 let index=0,up=true;for(let right=size-1;right>=1;right-=2){if(right===6)right=5;for(let k=0;k<size;k++){const y=up?size-1-k:k;for(let dx=0;dx<2;dx++){const x=right-dx;if(reserved[y][x])continue;const bit=index<codewords.length*8?(codewords[index>>>3]>>>(7-(index&7)))&1:0;m[y][x]=!!(bit^((x+y)%2===0?1:0));index++;}}up=!up;}
 let path='';for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(m[y][x])path+=`M${x+4},${y+4}h1v1h-1z`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="360" height="360" shape-rendering="crispEdges"><rect width="45" height="45" fill="white"/><path d="${path}" fill="black"/></svg>`;
}
module.exports={qrSVG};
