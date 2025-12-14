import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Profile {
    id?: string;
    name: string;
    dob: string;
    retirementAge: number | null;
}

@Injectable({
    providedIn: 'root'
})
export class ProfileService {
    private apiUrl = 'http://localhost:8080/api/profiles';

    constructor(private http: HttpClient) { }

    getProfiles(): Observable<Profile[]> {
        return this.http.get<Profile[]>(this.apiUrl);
    }

    createProfile(profile: Profile): Observable<Profile> {
        return this.http.post<Profile>(this.apiUrl, profile);
    }

    updateProfile(id: string, profile: Profile): Observable<Profile> {
        return this.http.put<Profile>(`${this.apiUrl}/${id}`, profile);
    }
}
