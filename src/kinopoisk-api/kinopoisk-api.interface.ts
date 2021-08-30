import { AxiosResponse } from 'axios';
import { paths } from './kinopoisk-api.generated';

export type GetFilmDataResponse = paths['/api/v2.1/films/{id}']['get']['responses'][200]['content']['application/json'];
export type GetFilmData = AxiosResponse<GetFilmDataResponse>;
