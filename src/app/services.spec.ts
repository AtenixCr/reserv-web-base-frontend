import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Api } from './api';
import { ParkService, PublicBusiness } from './models';

const service: ParkService = {
  id: '42',
  imageUrl: 'https://media.example.com/trail.webp',
  iconUrl: 'https://media.example.com/trail.svg',
  translations: [
    { locale: 'es', name: 'Recorrido del río', description: 'Descripción del servidor', imageAlt: 'Sendero junto al río' },
    { locale: 'en', name: 'River trail', description: '', imageAlt: 'Trail by the river' }
  ]
};
const business: PublicBusiness = {
  configured: true, reservationsEnabled: false, serverDate: '2026-10-10', currency: 'CRC',
  translations: [{ locale: 'es', displayName: 'Parque', description: '', services: 'Información anterior del servidor' }],
  ratePlan: null, exchangeRates: [], services: [service]
};

describe('Services from the public API', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({ providers: [
      { provide: Api, useValue: { request: vi.fn().mockResolvedValue(structuredClone(business)) } }
    ] });
  });

  it('renders backend media and translated content with a Spanish fallback per field', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.componentInstance.setLocale('en');
    fixture.detectChanges();
    const card: HTMLElement = fixture.nativeElement.querySelector('.service-item');
    expect(card.querySelector('h3')?.textContent).toBe('River trail');
    expect(card.querySelector('p')?.textContent).toContain('Descripción del servidor');
    expect(card.querySelector('.service-photo img')?.getAttribute('src')).toBe(service.imageUrl);
    expect(card.querySelector('.service-photo img')?.getAttribute('alt')).toBe('Trail by the river');
    expect(card.querySelector('.service-icon img')?.getAttribute('src')).toBe(service.iconUrl);
    fixture.componentInstance.setLocale('pt');
    fixture.detectChanges();
    expect(card.querySelector('h3')?.textContent).toBe('Recorrido del río');
  });

  it('supports the old API and an empty catalog without inventing services', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    for (const services of [undefined, []]) {
      fixture.componentInstance.data.set({ ...business, services });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.service-item')).toBeNull();
      expect(fixture.nativeElement.querySelector('.services-section').textContent)
        .toContain('Información anterior del servidor');
    }
    fixture.componentInstance.data.set({ ...business, services: [], translations: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.services-section').textContent)
      .toContain(fixture.componentInstance.t('noInfo'));
  });

  it('preserves API ordering and displays more than two services', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.componentInstance.data.set({ ...business, services: ['3', '1', '2'].map(id => ({
      ...service, id, translations: [{ locale: 'es', name: id, description: '', imageAlt: '' }]
    })) });
    fixture.detectChanges();
    const titles = Array.from(fixture.nativeElement.querySelectorAll('.service-item h3') as NodeListOf<HTMLElement>);
    expect(titles.map(title => title.textContent)).toEqual(['3', '1', '2']);
  });

  it('rejects non-HTTP media and keeps the service readable after an image failure', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.service-photo img').dispatchEvent(new Event('error'));
    fixture.nativeElement.querySelector('.service-icon img').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.service-item img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.service-item h3').textContent).toBe('Recorrido del río');
    fixture.componentInstance.data.set({ ...business, services: [{
      ...service, imageUrl: 'javascript:alert(1)', iconUrl: 'data:image/svg+xml,<svg/>'
    }] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.service-item img')).toBeNull();
  });
});
