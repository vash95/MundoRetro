import test from 'node:test';
import assert from 'node:assert/strict';
import {metadataChoices,searchMetadata} from '../lib/metadata-service.ts';

test('maps a specific game platform, release year, genre and description',()=>{
 const [choice]=metadataChoices([{id:1,game_title:'Example',release_date:'1997-06-30',platform:3,genres:[8,999],overview:'Description'}],'games',{'8':{name:'Adventure'}},[{id:3,name:'Nintendo 64'}]);
 assert.equal(choice.year,'1997');assert.equal(choice.platform,'Nintendo 64');
 assert.deepEqual(choice.fields,{'Lanzamiento (origen)':'1997','G�nero':'Adventure','Descripci�n':'Description','Plataforma':'Nintendo 64'});
 assert.ok(!('Estado' in choice.fields));assert.ok(!('A�o completado' in choice.fields));
});
test('does not invent missing fields or dates for consoles',()=>{
 assert.deepEqual(metadataChoices([{id:2,name:'Console',developer:'Maker'}],'consoles')[0].fields,{Fabricante:'Maker'});
 assert.deepEqual(metadataChoices([{id:3,game_title:'Unknown',release_date:'unknown'}],'games')[0].fields,{});
});
test('search preserves separate game editions and resolves lookup tables',async()=>{
 const calls=[];
 const fetcher=async(url,options)=>{calls.push([new URL(url),options]);const path=new URL(url).pathname;return Response.json({data:path.endsWith('/Genres')?{genres:{8:{name:'Adventure'}}}:path.endsWith('/Platforms')?{platforms:{3:{id:3,name:'Nintendo 64'},4:{id:4,name:'Other platform'}}}:{games:[{id:1,game_title:'Example',release_date:'1997-01-01',platform:3,genres:[8]},{id:2,game_title:'Example',release_date:'2001-01-01',platform:4}]}})};
 const choices=await searchMetadata('Example','games','test-key',fetcher);
 assert.equal(choices.length,2);assert.equal(choices[0].platform,'Nintendo 64');assert.equal(choices[1].year,'2001');
 assert.equal(calls.length,3);assert.equal(calls[0][0].searchParams.get('fields'),'genres,overview,platform');
 assert.equal(calls[1][1].next.revalidate,2592000);
});
test('quota errors stop before making extra requests',async()=>{
 let count=0;await assert.rejects(searchMetadata('Example','games','test-key',async()=>{count++;return new Response('',{status:429})}),/RATE_LIMITED/);assert.equal(count,1);
});

