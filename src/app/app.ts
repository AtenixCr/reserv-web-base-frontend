import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Reservation } from './reservation';
import { Api, ApiFailure } from './api';
import { Locale, PublicBusiness, Rate } from './models';
import { translations } from './translations';
import { displayMoney } from './money';
@Component({selector:'app-root',imports:[Reservation],templateUrl:'./app.html',styleUrl:'./app.css'})
export class App implements OnInit {
  private readonly api=inject(Api);
  readonly locale=signal<Locale>(this.readLocale());
  readonly currency=signal('CRC');
  readonly data=signal<PublicBusiness|null>(null);
  readonly error=signal('');
  readonly loading=signal(true);
  readonly content=computed(()=>{const list=this.data()?.translations||[];const fallback=list.find(t=>t.locale==='es');const selected=list.find(t=>t.locale===this.locale());if(!selected)return fallback;return {...selected,displayName:selected.displayName||fallback?.displayName||'',description:selected.description||fallback?.description||'',services:selected.services||fallback?.services||''};});
  readonly rate=computed(()=>this.data()?.exchangeRates.find(r=>r.currency===this.currency()));
  readonly priceFields=['adultPrice','childPrice','seniorPrice','parkingPrice'] as const;
  readonly priceLabels=['adults','children','seniors','vehicles'];
  ngOnInit():void {this.setLocale(this.locale());void this.load();}
  t(key:string):string{return translations[this.locale()][key]||key;}
  private readLocale():Locale{try{const value=window.localStorage.getItem('locale');return value==='en'||value==='pt'?value:'es';}catch{return 'es';}}
  setLocale(value:string):void{if(value!=='es'&&value!=='en'&&value!=='pt')return;this.locale.set(value);document.documentElement.lang=value;document.title=this.content()?.displayName||this.t('publicTitle');try{window.localStorage.setItem('locale',value);}catch{}}
  setCurrency(value:string):void{if(value==='CRC'||((value==='USD'||value==='BRL')&&this.canConvert(value))){this.currency.set(value);try{window.localStorage.setItem('currency',value);}catch{}}}
  canConvert(currency:string):boolean{return !!this.data()?.exchangeRates.some(r=>r.currency===currency&&r.updatedOn<=this.data()!.serverDate&&/^0*[1-9]|[1-9]/.test(r.rate));}
  amount(field:keyof Omit<Rate,'id'>):string{const raw=this.data()?.ratePlan?.[field]||'0.00';return displayMoney(raw,this.currency(),this.locale(),this.currency()==='CRC'?undefined:this.rate()?.rate);}
  dayName(day:number):string{return new Intl.DateTimeFormat(this.locale(),{weekday:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2024,0,day)));}
  async load():Promise<void>{this.loading.set(true);this.error.set('');try{this.data.set(await this.api.request<PublicBusiness>('/public/business'));try{this.setCurrency(window.localStorage.getItem('currency')||'CRC');}catch{}if(this.currency()!=='CRC'&&!this.canConvert(this.currency()))this.currency.set('CRC');document.title=this.content()?.displayName||this.t('publicTitle');}catch(e){this.error.set(e instanceof ApiFailure?e.code:'UNEXPECTED_ERROR');}finally{this.loading.set(false);}}
}
