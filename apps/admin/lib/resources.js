const text=(key,label,required=true,extra={})=>({key,label,required,type:'text',...extra});
const number=(key,label,required=false,extra={})=>({key,label,required,type:'number',...extra});
export const resources={
 projects:{title:'Projects',singular:'project',intro:'The spaces you create, and the stories behind them.',fields:[text('slug','URL slug',true,{labelTr:'URL kısa adı',help:'Lowercase letters, numbers and hyphens. Keep this stable after publishing.',helpTr:'Küçük İngilizce harfler, rakamlar ve kısa çizgi kullanın.'}),{key:'category_id',label:'Project category',labelTr:'Proje kategorisi',type:'category',source:'project-categories',required:true},text('location','Location',true,{labelTr:'Konum'}),number('area_sqm','Area (m²)',false,{labelTr:'Alan (m²)',min:0}),number('construction_year','Construction year',false,{labelTr:'Yapım yılı',min:1800,max:2200}),{key:'is_featured',label:'Feature on the homepage',labelTr:'Ana sayfada öne çıkar',type:'checkbox'}],translations:[text('title','Project title',true,{labelTr:'Proje adı',maxLength:180}),text('concept','Concept',true,{labelTr:'Konsept',maxLength:240}),text('short_description','Short description',true,{labelTr:'Kısa açıklama',type:'textarea',maxLength:500}),text('description','Project story',true,{labelTr:'Proje açıklaması',type:'textarea'}),text('challenge','The challenge',false,{labelTr:'İhtiyaç',type:'textarea'}),text('approach','Our approach',false,{labelTr:'Yaklaşımımız',type:'textarea'}),text('outcome','The outcome',false,{labelTr:'Sonuç',type:'textarea'})],statuses:['draft','published','archived'],gallery:true,allowIncompleteDraft:true},
 articles:{title:'Journal',singular:'article',intro:'Ideas, observations and news from the studio.',fields:[text('slug','URL slug',true),{key:'category_id',label:'Journal category',type:'category',source:'blog-categories'}, {key:'published_at',label:'Publication date & time',type:'datetime-local',help:'A future date schedules this article once its status is Published.'}],translations:[text('title','Article title',true,{maxLength:240}),text('excerpt','Short introduction',true,{type:'textarea',maxLength:600}),text('content_html','Article body',true,{type:'rich'})],statuses:['draft','published','archived'],imageKey:'cover_media_id',imageLabel:'Cover image'},
 testimonials:{title:'Testimonials',singular:'testimonial',intro:'First-hand perspectives from the people you work with.',fields:[text('client_name','Client name'),text('company','Company',false),text('role','Role / title',false),number('rating','Rating (1–5)',true,{min:1,max:5})],translations:[text('quote','Client quote',true,{type:'textarea'})],statuses:['draft','published','hidden'],imageKey:'avatar_media_id',imageLabel:'Client photograph'},
 'project-categories':{title:'Project categories',singular:'category',intro:'Give your portfolio a clear structure.',fields:[text('slug','URL slug',true),number('sort_order','Display order',true,{min:0}),{key:'is_active',label:'Available on the website',type:'checkbox'}],translations:[text('name','Category name',true,{maxLength:120})]},
 'blog-categories':{title:'Journal categories',singular:'category',intro:'Organize your ideas by subject.',fields:[text('slug','URL slug',true),number('sort_order','Display order',true,{min:0}),{key:'is_active',label:'Available on the website',type:'checkbox'}],translations:[text('name','Category name',true,{maxLength:120})]}
};
export function emptyRecord(config){
 const item={translations:{en:{},tr:{}}};
 for(const field of config.fields)item[field.key]=field.type==='checkbox'?field.key==='is_active':field.type==='number'?(field.key==='rating'?5:field.key==='sort_order'?0:''):'';
 for(const language of ['en','tr']) for(const field of config.translations)item.translations[language][field.key]='';
 if(config.statuses)item.status='draft';
 if(config.gallery)item.images=[];
 if(config.imageKey)item[config.imageKey]=null;
 if(config.videoKey)item[config.videoKey]=null;
 return item;
}
export function titleOf(item){return item.translations?.en?.title||item.translations?.en?.name||item.client_name||item.slug;}

// Hero videos are optional project media. Keeping this metadata beside the
// resource config lets the shared editor handle projects without changing the
// image fields used by articles and testimonials.
resources.projects.videoKey='video_media_id';
resources.projects.videoLabel='Hero video';
resources.projects.videoLabelTr='Hero videosu';
