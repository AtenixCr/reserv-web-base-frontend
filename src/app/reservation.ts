import { Component, HostListener, OnChanges, SimpleChanges, inject, input, signal } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api, ApiFailure } from './api';
import { Locale, PublicBusiness, Hour } from './models';
import { translations } from './translations';
import { displayMoney } from './money';
export interface ReservationRequest { visitDate:string; name:string; email:string; phone:string; adults:number; children:number; seniors:number; vehicles:number; note:string; locale:Locale; rateVersion?:string; }
export interface AvailabilityDay { visitDate:string; hours:Hour[]; available:number; reason:string|null; }
export interface AvailabilityMonth { serverDate:string; minDate:string; maxDate:string; days:AvailabilityDay[]; }
export interface Quote { visitDate:string; rateVersion:string; currency:string; lines:{category:string;quantity:number;unitPrice:string;subtotal:string}[]; total:string; hours:Hour[]; }
export interface Confirmation { id:string;code:string;status:string;version:string;name:string;locale:Locale;quote:Quote;sinpeNumber:string;businessName:string;phone:string;email:string;emailStatus:string; }
@Component({selector:'app-reservation',imports:[FormsModule,KeyValuePipe],templateUrl:'./reservation.html',styleUrl:'./reservation.css'})
export class Reservation implements OnChanges {
  private readonly api=inject(Api);
  readonly business=input.required<PublicBusiness>();
  readonly locale=input<Locale>('es');
  readonly currency=input('CRC');
  readonly open=signal(false);
  readonly busy=signal(false);
  readonly availability=signal<AvailabilityMonth|null>(null);
  readonly quote=signal<Quote|null>(null);
  readonly confirmation=signal<Confirmation|null>(null);
  readonly error=signal('');
  readonly fields=signal<Record<string,string>>({});
  readonly uncertain=signal(false);
  readonly month=signal('');
  readonly counts=['adults','children','seniors','vehicles'] as const;
  readonly contacts=['name','email','phone'] as const;
  draft:ReservationRequest=this.empty();
  private key='';
  private submitted:ReservationRequest|null=null;
  dirty=false;
  ngOnChanges(changes:SimpleChanges):void{if(changes['locale']&&!changes['locale'].firstChange&&this.quote()&&!this.uncertain()&&!this.busy())this.edit();}
  private empty():ReservationRequest{return {visitDate:'',name:'',email:'',phone:'',adults:1,children:0,seniors:0,vehicles:0,note:'',locale:'es'};}
  t(key:string):string{return translations[this.locale()][key]||key;}
  money(value:string):string{return displayMoney(value,'CRC',this.locale());}
  estimate(value:string):string{const rate=this.business().exchangeRates.find(r=>r.currency===this.currency());return displayMoney(value,this.currency(),this.locale(),rate?.rate);}
  dateLabel(value:string):string{return new Intl.DateTimeFormat(this.locale(),{dateStyle:'full',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));}
  monthLabel():string{return this.month()?new Intl.DateTimeFormat(this.locale(),{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(this.month()+'-01T12:00:00Z')):'';}
  padding():number[]{if(!this.month())return [];const day=new Date(this.month()+'-01T12:00:00Z').getUTCDay();return Array.from({length:(day+6)%7},(_,i)=>i);}
  weekdays():string[]{return Array.from({length:7},(_,i)=>new Intl.DateTimeFormat(this.locale(),{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2024,0,i+1))));}
  selected():AvailabilityDay|undefined{return this.availability()?.days.find(d=>d.visitDate===this.draft.visitDate);}
  changed():void{this.dirty=true;this.quote.set(null);this.fields.set({});this.error.set('');this.key='';this.submitted=null;}
  async start():Promise<void>{this.open.set(true);this.confirmation.set(null);await this.loadMonth(this.business().serverDate.slice(0,7));}
  canMove(delta:number):boolean{const next=this.nextMonth(delta);return next>=this.business().serverDate.slice(0,7)&&next<=(this.availability()?.maxDate.slice(0,7)||this.business().serverDate.slice(0,7));}
  private nextMonth(delta:number):string{const date=new Date(this.month()+'-01T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+delta);return date.toISOString().slice(0,7);}
  async move(delta:number):Promise<void>{if(this.canMove(delta))await this.loadMonth(this.nextMonth(delta));}
  async loadMonth(value:string):Promise<void>{this.busy.set(true);this.error.set('');try{const data=await this.api.request<AvailabilityMonth>('/public/availability?month='+value);this.availability.set(data);this.month.set(value);if(this.draft.visitDate&&this.draft.visitDate.slice(0,7)!==value){this.draft.visitDate='';this.changed();}}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  choose(day:AvailabilityDay):void{if(day.reason||this.busy()||this.uncertain())return;this.draft.visitDate=day.visitDate;this.changed();}
  private fail(e:unknown):void{this.error.set(e instanceof ApiFailure?e.code:'UNEXPECTED_ERROR');this.fields.set(e instanceof ApiFailure?e.fields:{});queueMicrotask(()=>document.getElementById('reservation-feedback')?.focus());}
  async review():Promise<void>{
    if(this.busy()||this.uncertain())return;this.busy.set(true);this.error.set('');this.fields.set({});
    try{this.draft.locale=this.locale();const result=await this.api.request<Quote>('/public/reservation-quotes','POST',this.draft);this.quote.set(result);this.key=crypto.randomUUID();this.submitted={...this.draft,rateVersion:result.rateVersion};queueMicrotask(()=>document.getElementById('reservation-review')?.focus());}catch(e){this.fail(e);}finally{this.busy.set(false);}
  }
  async confirm():Promise<void>{
    if(this.busy()||!this.submitted||!this.key)return;this.busy.set(true);this.error.set('');
    try{const result=await this.api.request<Confirmation>('/public/reservations','POST',this.submitted,{'Idempotency-Key':this.key});this.confirmation.set(result);this.quote.set(null);this.dirty=false;this.uncertain.set(false);this.draft=this.empty();queueMicrotask(()=>document.getElementById('reservation-success')?.focus());}
    catch(e){if(!(e instanceof ApiFailure)||e.status===0||e.status>=500||e.code==='IDEMPOTENCY_CONFLICT'){this.uncertain.set(true);}else if(e.status!==429){this.uncertain.set(false);this.quote.set(null);this.key='';this.submitted=null;}this.fail(e);}finally{this.busy.set(false);}
  }
  edit():void{if(this.busy()||this.uncertain())return;this.quote.set(null);this.key='';this.submitted=null;}
  cancel():void{if(this.busy()||this.uncertain())return;if(this.dirty&&!window.confirm(this.t('discard')))return;this.draft=this.empty();this.quote.set(null);this.confirmation.set(null);this.error.set('');this.fields.set({});this.dirty=false;this.open.set(false);this.key='';this.submitted=null;}
  @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent):void{if(this.dirty){event.preventDefault();event.returnValue='';}}
}
