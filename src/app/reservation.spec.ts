import { TestBed } from '@angular/core/testing';
import { Reservation, Quote } from './reservation';
import { Api, ApiFailure } from './api';
import Swal from 'sweetalert2';
const quote:Quote={visitDate:'2026-09-26',rateVersion:'1',currency:'CRC',lines:[{category:'adults',quantity:1,unitPrice:'5000.00',subtotal:'5000.00'}],total:'5000.00',hours:[{weekday:6,opensAt:'08:00',closesAt:'17:00'}]};
describe('Public reservation',()=>{
  let request:ReturnType<typeof vi.fn>;
  beforeEach(()=>{window.sessionStorage.clear();request=vi.fn();vi.spyOn(Swal,'fire').mockResolvedValue({isConfirmed:false,isDenied:false,isDismissed:true});TestBed.configureTestingModule({providers:[{provide:Api,useValue:{request}}]});});
  function component(){const fixture=TestBed.createComponent(Reservation);fixture.componentRef.setInput('business',{serverDate:'2026-09-25',exchangeRates:[]});return fixture.componentInstance;}
  it('reuses the same key and body after a lost confirmation response',async()=>{
    const app=component();app.draft={visitDate:'2026-09-26',name:'Test Visitor',email:'test@example.invalid',phone:'00000000',adults:1,children:0,seniors:0,vehicles:0,note:'',locale:'es'};app.dirty=true;
    request.mockResolvedValueOnce(quote);await app.review();request.mockRejectedValueOnce(new ApiFailure('NETWORK_ERROR'));await app.confirm();
    expect(app.uncertain()).toBe(true);const first=request.mock.calls[1];app.cancel();expect(app.draft.name).toBe('Test Visitor');
    request.mockResolvedValueOnce({code:'RES-RANDOM',quote,emailStatus:'PENDING'});await app.confirm();expect(request.mock.calls[2]).toEqual(first);expect(app.confirmation()?.code).toBe('RES-RANDOM');expect(app.dirty).toBe(false);
  });
  it('requires new review after changed prices and preserves entered details',async()=>{
    const app=component();app.draft.name='Test Visitor';request.mockResolvedValueOnce(quote);await app.review();request.mockRejectedValueOnce(new ApiFailure('RATE_CHANGED',{},409));await app.confirm();expect(app.quote()).toBeNull();expect(app.draft.name).toBe('Test Visitor');expect(app.error()).toBe('RATE_CHANGED');
    request.mockResolvedValueOnce({...quote,rateVersion:'2',total:'6000.00'});await app.review();expect(app.quote()?.total).toBe('6000.00');expect(request).toHaveBeenCalledTimes(3);
  });
  it('does not discard changes until the SweetAlert confirmation is accepted',async()=>{
    const app=component();app.open.set(true);app.draft.name='Test';app.dirty=true;
    await app.cancel();expect(app.draft.name).toBe('Test');expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({icon:'warning',showCancelButton:true,confirmButtonColor:'#164A3F',cancelButtonColor:'#777777'}));
    vi.mocked(Swal.fire).mockResolvedValue({isConfirmed:true,isDenied:false,isDismissed:false});
    await app.cancel();expect(app.draft.name).toBe('');expect(app.open()).toBe(false);
  });
  it('restores a draft after reload without a browser confirmation',async()=>{
    const app=component();app.draft.name='Test Visitor';app.draft.email='test@example.invalid';app.changed();
    expect(window.sessionStorage.getItem('reservation-draft-v1')).toContain('Test Visitor');
    request.mockResolvedValue({serverDate:'2026-09-25',minDate:'2026-09-25',maxDate:'2026-10-25',days:[]});
    const restored=component();restored.ngOnChanges({business:{previousValue:undefined,currentValue:{serverDate:'2026-09-25'},firstChange:true,isFirstChange:()=>true}});
    expect(restored.open()).toBe(true);expect(restored.draft.name).toBe('Test Visitor');expect(restored.draft.email).toBe('test@example.invalid');
    await Promise.resolve();
  });
  it('retries an uncertain confirmation with the same idempotency key after reload',async()=>{
    const app=component();app.draft.name='Test Visitor';app.changed();
    request.mockResolvedValueOnce(quote);await app.review();
    request.mockRejectedValueOnce(new ApiFailure('NETWORK_ERROR'));await app.confirm();
    const first=request.mock.calls[1];
    request.mockResolvedValueOnce({serverDate:'2026-09-25',minDate:'2026-09-25',maxDate:'2026-10-25',days:[]});
    const restored=component();restored.ngOnChanges({business:{previousValue:undefined,currentValue:{serverDate:'2026-09-25'},firstChange:true,isFirstChange:()=>true}});
    await vi.waitFor(()=>expect(restored.busy()).toBe(false));
    expect(restored.error()).toBe('NETWORK_ERROR');
    expect(restored.uncertain()).toBe(true);
    request.mockResolvedValueOnce({code:'RES-RANDOM',quote,emailStatus:'PENDING'});
    await restored.confirm();expect(request.mock.calls.filter(call=>call[0]==='/public/reservations').at(-1)).toEqual(first);
    expect(window.sessionStorage.getItem('reservation-draft-v1')).toBeNull();
  });
});
