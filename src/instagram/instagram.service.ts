import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class InstagramService {
  constructor(private readonly httpService: HttpService) {}

  async getLastPostId(nickname: string): Promise<string> {
    const response = await lastValueFrom(
      this.httpService.get<string>(`https://www.instagram.com/${nickname}/`),
    );

    const startText = '<script type="text/javascript">window._sharedData = ';
    const endText =
      ';</script>\n<script type="text/javascript">window.__initialDataLoaded';

    const startIndex = response.data.indexOf(startText);
    const endIndex = response.data.indexOf(endText);

    const jsonText = response.data.substring(
      startIndex + startText.length,
      endIndex,
    );
    const json = JSON.parse(jsonText);

    const shortcode =
      json.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media
        .edges[0].node.shortcode;

    return shortcode;
  }
}
