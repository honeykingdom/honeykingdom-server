import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class InstagramService {
  constructor(private readonly httpService: HttpService) {}

  async getLastPostId(nickname: string): Promise<string> {
    let id = '';

    try {
      const response = await lastValueFrom(
        this.httpService.get(`https://www.instagram.com/${nickname}/?__a=1`),
      );

      id =
        response.data.graphql.user.edge_owner_to_timeline_media.edges[0].node
          .shortcode;
    } catch (e) {}

    return id;
  }
}
