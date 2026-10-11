"use strict";
// Formatting validation only; this does not verify ownership or send SMS.
function normalizePhone(value, required=false) {
 if(value===undefined||value===null||value===''){if(required)throw new Error('Add a phone number before requesting verification.');return '';}
 if(typeof value!=='string'||value.length>40)throw new Error('Enter a valid phone number with country code.');
 const raw=value.trim();if(!raw){if(required)throw new Error('Add a phone number before requesting verification.');return '';}
 if(!/^\+?[0-9 () .-]+$/.test(raw))throw new Error('Enter a valid phone number with country code.');
 let digits=raw.replace(/\D/g,'');if(/^(\d)\1+$/.test(digits))throw new Error('Enter a valid phone number with country code.');
 if(!raw.startsWith('+')){if(digits.length===10)digits='1'+digits;else if(digits.length!==11||!digits.startsWith('1'))throw new Error('Use + and the country code for international numbers.');}
 if(digits.length<8||digits.length>15||digits.startsWith('0')||/^(\d)\1+$/.test(digits))throw new Error('Enter a valid phone number with country code.');
 return '+'+digits;
}
module.exports={normalizePhone};
