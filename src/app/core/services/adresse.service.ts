import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface SwissAddress {
  street: string;
  houseNumber?: string;
  postalCode: string;
  locality: string;
  formattedAddress: string;
}

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  private readonly http = inject(HttpClient);

  searchAddresses(query: string): Observable<SwissAddress[]> {
    if (!query || query.length < 3) {
      return of([]);
    }

    return this.http.get<any>(`https://api3.geo.admin.ch/rest/services/api/SearchServer`, {
      params: {
        searchText: query,
        type: 'locations',
        limit: '10',
        returnGeometry: 'false'
      }
    }).pipe(
      map(response => this.parseGeoAdminResponse(response)),
      catchError(() => of([]))
    );
  }

  private parseGeoAdminResponse(response: any): SwissAddress[] {
    if (!response?.results) return [];

    return response.results
      .filter((result: any) => result.attrs?.origin === 'address')
      .map((result: any) => {
        const attrs = result.attrs;
        const address: SwissAddress = {
          street: attrs.street || '',
          houseNumber: attrs.house_number || '',
          postalCode: attrs.zip || '',
          locality: attrs.city || '',
          formattedAddress: this.formatAddress(attrs)
        };
        return address;
      })
      .slice(0, 8);
  }

  private formatAddress(attrs: any): string {
    const parts = [];

    if (attrs.street) {
      let streetPart = attrs.street;
      if (attrs.house_number) {
        streetPart += `, ${attrs.house_number}`;
      }
      parts.push(streetPart);
    }

    if (attrs.zip && attrs.city) {
      parts.push(`${attrs.zip} ${attrs.city}`);
    }

    return parts.join(', ');
  }
}
