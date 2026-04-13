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
        const label = (attrs.label || '').replace(/<[^>]+>/g, '').replace(/#/g, '').trim();
        // Format après nettoyage: "Chemin des Faucons 2362 Montfaucon" ou "Rue du Lac 1 1898 St-Gingolph"
        const cpMatch = label.match(/^(.+?)\s+(\d{4})\s+(.+)$/);
        if (!cpMatch) {
          return { street: label, houseNumber: '', postalCode: '', locality: '', formattedAddress: label };
        }

        const streetFull = cpMatch[1].trim();
        const postalCode = cpMatch[2];
        const locality = cpMatch[3].trim();

        // Numéro de rue = dernier token numérique à la fin de streetFull
        const streetMatch = streetFull.match(/^(.+?)\s+(\d+\w*)$/);
        const street = streetMatch ? streetMatch[1] : streetFull;
        const houseNumber = streetMatch ? streetMatch[2] : '';

        const formattedAddress = houseNumber
          ? `${street} ${houseNumber}, ${postalCode} ${locality}`
          : `${street}, ${postalCode} ${locality}`;

        return { street, houseNumber, postalCode, locality, formattedAddress };
      })
      .filter((a: SwissAddress) => a.street)
      .slice(0, 8);
  }
}
