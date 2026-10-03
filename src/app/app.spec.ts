import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Api } from './api';
import { displayMoney } from './money';
import { PublicBusiness } from './models';

const business:PublicBusiness={configured:true,reservationsEnabled:false,serverDate:'2026-09-25',currency:'CRC',translations:[{locale:'es',displayName:'Parque de prueba',description:'Descripción',services:'Senderos'}],hours:[],ratePlan:{id:'1',adultPrice:'17000.00',childPrice:'0.00',seniorPrice:'0.00',parkingPrice:'0.00'},exchangeRates:[{currency:'USD',rate:'0.00200000',updatedOn:'2026-09-25'}]};
describe('Public information',()=>{
  beforeEach(()=>{window.localStorage.clear();TestBed.configureTestingModule({providers:[{provide:Api,useValue:{request:vi.fn().mockResolvedValue(structuredClone(business))}}]});});
  it('falls back to Spanish content and disables missing exchange rates',async()=>{
    const fixture=TestBed.createComponent(App);await fixture.whenStable();
    fixture.componentInstance.setLocale('en');
    expect(fixture.componentInstance.content()?.displayName).toBe('Parque de prueba');
    expect(fixture.componentInstance.canConvert('BRL')).toBe(false);
    fixture.componentInstance.setCurrency('BRL');expect(fixture.componentInstance.currency()).toBe('CRC');
    fixture.componentInstance.setCurrency('USD');
    expect(fixture.componentInstance.amount('adultPrice')).toContain('34.00');
    expect(fixture.componentInstance.data()?.ratePlan?.adultPrice).toBe('17000.00');
    expect(window.localStorage.getItem('locale')).toBe('en');
  });
  it('rounds exact decimal conversions half up without floating point',()=>{
    expect(displayMoney('0.01','USD','en','0.50000000')).toBe('$0.01');
    expect(displayMoney('99999999999999999.99','USD','en','1.00000000')).toBe('$99,999,999,999,999,999.99');
  });
});
