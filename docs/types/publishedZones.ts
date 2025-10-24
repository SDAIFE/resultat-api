// types/publishedZones.ts

export interface PublishedZonesResponse {
  success: boolean;
  data: PublishedZonesData;
  message: string;
  timestamp: string;
}

export interface PublishedZonesData {
  electionId: string;
  electionName: string;
  regions: Region[];
}

export interface Region {
  id: string;
  name: string;
  departments: Department[];
}

export interface Department {
  id: string;
  name: string;
  votingPlaces: VotingPlace[];
}

export interface VotingPlace {
  id: string;
  name: string;
  pollingStations: PollingStation[];
}

export interface PollingStation {
  id: string;
  name: string;
}

export interface ZoneSelection {
  regionId: string;
  departmentId: string;
  votingPlaceId: string;
  pollingStationId: string;
}

export interface ZoneStats {
  totalRegions: number;
  totalDepartments: number;
  totalVotingPlaces: number;
  totalPollingStations: number;
}
