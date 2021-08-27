import path from 'path';
import * as fs from 'fs';
import parseTelegramPost from './parseTelegramPost';

const readFile = (filename: string) =>
  fs.promises.readFile(
    path.resolve('./src/telegram-api/mocks', filename),
    'utf8',
  );

describe('parseTelegramMessage', () => {
  it('should return null with empty args', async () => {
    expect(parseTelegramPost('')).toEqual({
      type: 'not-found',
      post: null,
    });
  });

  it('should parse "post not found"', async () => {
    expect(parseTelegramPost(await readFile('post-not-found.html'))).toEqual({
      type: 'not-found',
      post: null,
    });
  });

  it('should parse text post', async () => {
    expect(parseTelegramPost(await readFile('text-only.html'))).toEqual({
      type: 'post',
      post: {
        id: 40973,
        channel: { id: 1036240821, name: 'meduzalive', title: 'Медуза — LIVE' },
        date: 1618072032000,
        link: 'https://t.me/meduzalive/40973',
        bodyText:
          'Похороны супруга королевы Елизаветы II, герцога Эдинбургского Филиппа состоятся в Виндзоре 17 апреля. Из-за пандемии коронавируса количество участников церемонии будет ограничено. Помимо носильщиков гроба и архиепископа Кентерберийского, на похоронах будут присутствовать 30 человек. Среди них будет принц Гарри, который прилетит на похороны из США. https://mdza.io/KIvp8C9R7Kg',
        media: [],
      },
    });

    expect(parseTelegramPost(await readFile('text-only-2.html'))).toEqual({
      type: 'post',
      post: {
        id: 40988,
        channel: { id: 1036240821, name: 'meduzalive', title: 'Медуза — LIVE' },
        date: 1618140378000,
        link: 'https://t.me/meduzalive/40988',
        bodyText:
          'Ожидание: красиво уходишь от погони Реальность: жаришь курицу https://mdza.io/xMT5Sg1Sfss',
        media: [],
      },
    });
  });

  it('should parse service message', async () => {
    expect(parseTelegramPost(await readFile('service-message.html'))).toEqual({
      type: 'service-message',
      post: null,
    });
  });

  it('should parse repost', async () => {
    expect(parseTelegramPost(await readFile('repost.html'))).toEqual({
      type: 'post',
      post: {
        id: 40984,
        channel: { id: 1036240821, name: 'meduzalive', title: 'Медуза — LIVE' },
        forwardedFrom: {
          channelName: 'stopcoronavirusrussia',
          channelTitle: 'СТОПКОРОНАВИРУС.РФ',
          postId: 4268,
        },
        date: 1618129234000,
        link: 'https://t.me/meduzalive/40984',
        bodyText:
          'За последние сутки в России выявлено 8 702 случая COVID-19 в 84 регионах, из них 1 133 (13,0%) — активно у контактных лиц без клинических проявлений болезни ❗️ Всего в стране нарастающим итогом выявлено 4 641 390 человек в 85 регионах. Также за сутки зафиксировано 337 летальных исходов. За весь период в России от коронавируса скончалось 102 986 человек. Записаться на вакцинацию можно по ссылке. #стопкоронавирус #здоровьевприоритете #coronavirus',
        media: [
          {
            type: 'image',
            url:
              'https://cdn4.telesco.pe/file/baENK7hmU2oW1FG7SOakHRPj4VWRVDC_fvKL7mlj5zN68o6QUiIk_UIrXS9Tj7QQTZAtdYqgFh8ZaHpZwOkLSWCqyE4GQ3_0A3AIfHAvqHMuis3taJfw-iKUHmyPreW_wjQcU_CiKqubTD0jZw6iYkwpl0SMhhcgzDjs_uPZVTmHv_g7F2JBPjsktY0BD3z_UcmUS1EkUJuRRQIv3D16f0FOIsATnPrTghR-bdpFWHlK5SRCXJC-neO5PcEMMox2FSxbsKiC6vMEivdr1Y0VGhV5ZyUiGELIlKQJsVo7u5UyAAhAhbJM2KaPLnbjmmJv01u6n9NQcmASCJetImuCGw.jpg',
          },
        ],
      },
    });
  });

  it('should parse reply', async () => {
    expect(parseTelegramPost(await readFile('reply.html'))).toEqual({
      type: 'post',
      post: {
        id: 40957,
        channel: { id: 1036240821, name: 'meduzalive', title: 'Медуза — LIVE' },
        replyTo: {
          postId: 40953,
          channelName: 'meduzalive',
          channelTitle: 'Медуза — LIVE',
          bodyText:
            '«Важные истории» уточнили, что обыск у главреда издания Романа Анина проходил по делу о нарушении неприкосновенности частной жизни, совершенном лицом с использованием своего служебного положения (часть 2 статьи 137). В каком статусе находится Анин, пока неясно.',
        },
        date: 1617993506000,
        link: 'https://t.me/meduzalive/40957',
        bodyText:
          'Обыск у главного редактора «Важных историй» Романа Анина продолжается уже пятый час подряд, сообщает журналист Алеся Мароховская.',
        media: [],
      },
    });
  });

  it('should parse post with one image', async () => {
    expect(parseTelegramPost(await readFile('one-image.html'))).toEqual({
      type: 'post',
      post: {
        id: 40978,
        channel: { id: 1036240821, name: 'meduzalive', title: 'Медуза — LIVE' },
        date: 1618076439000,
        link: 'https://t.me/meduzalive/40978',
        bodyText:
          'Во Франции аномальные холода, пришедшие в 10 из 13 регионов страны, уничтожили значительную часть будущего урожая винограда. В начале апреля по ночам в некоторых провинциях температура опускалась до минус восьми градусов по Цельсию; многие фермеры пытались согреть виноградники, зажигая свечи на участках. Из-за заморозков сборы винограда могут стать наименьшими за последние 40 лет, также ожидаются неурожаи яблок, абрикосов и других теплолюбивых культур. Власти Франции объявили режим чрезвычайной ситуации в сельском хозяйстве и задействовали механизм выплат компенсаций фермерам из специального фонда.',
        media: [
          {
            type: 'image',
            url:
              'https://cdn4.telesco.pe/file/t2avp0FFGK7yyqbxz2-O9gz7II7TeJHCEOI76q4wUI2CvnuSBoRkxFYXqgXpC7M9aQ4sfJt1n4O5171NpyL-mV53J2RsbRYoqrsf7wNMbXugRmOuxbyD2iNwt1mCW21wlks_rqz_eLjTTR1-x_3gM3L4UAuKVwT0jae-CCFvWxCafGrriubptbSai-1i9WOddmTV_EU-zlX9VZD9tV07zo46pnY89ntGMob6_F8v5yitGVviCWQ5ea2Np-IUqMdkHlz95t-na_5x8T30zYXlehSOfIbzyDiXwoJdPgE9k_y1jXjPd_J5UQ0-jw9yymmUf1Uz27Y9fRzMtnNXz0azRQ.jpg',
          },
        ],
      },
    });
  });

  it('should parse post with many images', async () => {
    expect(parseTelegramPost(await readFile('many-images.html'))).toEqual({
      type: 'post',
      post: {
        id: 42166,
        channel: { id: 1005031786, name: 'tvrain', title: 'Телеканал Дождь' },
        date: 1617980425000,
        link: 'https://t.me/tvrain/42166',
        bodyText:
          'Сегодня умер принц Филипп — муж королевы Елизаветы II. Через два месяца ему должно было исполниться 100 лет. В браке с королевой они прожили 73 года. Вспоминаем долгую и яркую жизнь принца. Больше фото — в галерее Дождя Фото: PA Wire / TASS; PA Images / TASS; Роман Денисов / ТАСС; Toby Melville / PA Wire / TASS; Adrian Dennis / AP; Alastair Grant / AP',
        media: [
          {
            type: 'image',
            url:
              'https://cdn4.telesco.pe/file/KJy1Nr-yckLw-dFZM_l-D5_Nnj2IPf-HVRrqliusPCn5PLgR5-ikXzIBH45F9-FlDBMO91bTtXtSsHQCKKO1U-TOXatrrlnbd4ebTmo5ldX-TBKTvJrPwZt9_hqHb_IeRkILOapsSp4JxPzADeQ62fVjRuWhVN2shcCm_I8FIGuJsaAnHRTkxDdowvqU_P1DzKxw7OrdmsuKXkbNfCtbGSWUM4VDYPQYXKvvBzRq5JVWD6gXDZw8dLKcc18JXLpKi4qFpo-HVGYMRcSwSzCgLGwtKsE4gPxkFi9dKe6xjI6xUnEkZch-bBA_i2FnPDZNil8zFoDOJYatazNFhKbm1A.jpg',
          },
          {
            type: 'image',
            url:
              'https://cdn4.telesco.pe/file/oqHmE1fJ97DnvZtIrHalVBnKvozCPHFkE58cXkuBS3boc3Lk9o7hz1jcvzMqhZvgP3Y5ADEBSs26zOQCz9UWinXSBCsxgTeUYsJceunhQBZrfKbojRhFE0Zsq7B2KAtkWwoOKmAZQ_7JfZ0W5_QI2_UCojeiohvRAVaRsGFqbFOxg2d7jmInuWnjUIni5uNGs2E9olt4rZ-Y9c4-6Ii3sgVG2ilb50EO1L1yhwK-nzz9dfclzvZsvpZng83z5QpQjicDIRK1ap3ANF2NhCIAcv8pxHJzx1TxEAWFKO5cxjgBJL40N_9rsgU4pLVehuc7vpVjRuMzHcAGGnA2AkWfDQ.jpg',
          },
          {
            type: 'image',
            url:
              'https://cdn4.telesco.pe/file/b2DM3qVw5nLPztb1CrwF4-YfgI57FBPpArPneUu56MZtsVimgLFRre55J23q7pRaiPVM73-HKRIaWaMs040cE9SKV-OoYdnaXY2HQK9DvmaDiMQ3VV_P05fDdGuKcnZ6N6Rp9Ofs8ztKt0Qhgk2MZrdccfyYS9cPt00cnb1a-yPN1Q_hcZX-vXfqy8stQKw7ttk2bl4i73IekK-xCFSHSPqxVovg0p7QHAsWRwcZTYe7BnBfQhpV5RozOn4Cos5l7bWe1V1fTRYzZ83l-rZsEuX4e4cWoOW4jdt67PHFa9cTOB6jOweZIotsdZO4M6aGEz7ItHARTYPXYYDL904YEA.jpg',
          },
          {
            type: 'image',
            url:
              'https://cdn4.telesco.pe/file/WYSZWwS7V95FdtvYlu6wgLCfmUeyjPvEnNJCdthphbBjCrH5LJoNsq0XsW7YjRtTEmhbIzlw9YpWedb-XU6XV-WCzkAu0Dg3-dW4xuX04HZXSbpSHKFGYS3N7dJvv3WWz__wI5wI2FHYPPOZcfKQs9UDlUBrHUWY9Lwk6bDw84HKb7NiWSQJQ0VsEfawh_gKXV1-6U8-KcdTSptRY97qaKzZCefpI1Uc4tfaM6gB9DOFykniJZHKEaeG4mIK7ep3vuqhz8e5b_lwcydmyNl0zfMtiSYacKfumXWERYmby5kMVsyJdGu3r6AZM21E8xL3ByvfO6Fsj_zA3nrYTTWm4g.jpg',
          },
          {
            type: 'image',
            url:
              'https://cdn4.telesco.pe/file/knIF4FdBwoDV6MvuZLuXpgSGk_TM7gm7eXVSDVaoYbAC4UQQrC3lqh2JHl0AsgM2R-nYfzAnUmxmDMz4xHITShz--K1haWgGlr-61iXOJpmcPDx65EZK5RkvqhLAzbnHHQchWRjI1GwPpRt7x01dgVBMbb4EEtksuCLxcCd02AhxOupE-MoMYx2CXOTPomZfo7mtdPhmqHNlTV0eOoOT1pFHCahLHbzROPw_TUSiszkDVSTkahoGm34jcyx5BNcsVG_PTibx10AQvTh-SKEhOP1YCiaId6P-n5G7TzPUSs_E0e_l2ZBrUX9OKqENjIGSWHfH8ygM8c6aC98y_9yVjw.jpg',
          },
          {
            type: 'image',
            url:
              'https://cdn4.telesco.pe/file/gGXqQmsyDf8ofdj4K1c_trlFBj6BDPIxkfpc9b89cVto86yLct3VEBo3ZrMou2mkCM3GySaACFIcfNRv1VTLrstpcqIC14rg6pUYRF2xaFljZ_tTNOhLnU1mv5tyvu_E1SvkdYfbe7l2POb5Dy2ruRJxoSsMRP43k43eToA0ElzP8HKj9x-txWP4zqwnhBG_koJtgGAt4U8JMvMfQB3Hr-ymq1JR8zSN0IAAjMXhdBBGXQQh6H569QfVAncCXUzgTUbY5CleXD2gTmf4fPjYKBWXE7nyiHVBI7vRMTouLYjZhvb-OrC2Q1zE6nUGcIBfzavH1Hk5X7tD0vBmzq2LXg.jpg',
          },
          {
            type: 'image',
            url:
              'https://cdn4.telesco.pe/file/r6w2e1I7yJtWaWujeDeoLHXDda3Crt7Mm2CUo8h7Vc65oidY6nTLIqbEn9xrtbOJ9iOJA-d56akZfa2Yg49K1w0AQ1yx9JDW_Kob41JowazkYNKd64PWyyEm2xgfwHZuEGA2RKdq5Gw_yDBaAT4tmjgDnQOaFGueTcDFz0FspiWOxMGetu4ZxumwKmBJSQNPvVCsgAE0J0K7Qn2QNzwpyCNLLtm0Y2oBMaQ52soQjTt0BDrIl4RoSCSV7xUVwY30m3j8mUsIb8DycngPBot6Ix-R9fe7JS-lbFhqXEMYPQLCVy6Ys12HD_Qg2okFQjPl7jsAZZz976Pjvpg_qHQl9g.jpg',
          },
        ],
      },
    });
  });

  it('should parse post with one video', async () => {
    expect(parseTelegramPost(await readFile('one-video.html'))).toEqual({
      type: 'post',
      post: {
        id: 42161,
        channel: { id: 1005031786, name: 'tvrain', title: 'Телеканал Дождь' },
        date: 1617973254000,
        link: 'https://t.me/tvrain/42161',
        bodyText:
          'На основателя «Артдокфеста» Виталия Манского напали активисты группы SERB. Пока режиссер давал интервью журналистам, к нему подбежали неизвестные, один из них попытался перехватить ему горло тканью Видео: Дождь',
        media: [
          {
            type: 'video',
            duration: '0:48',
            thumbUrl:
              'https://cdn4.telesco.pe/file/N9YOURdRr517K7NYiukcsTlfagoB-BMENznmUW10T3hpFkNdBQ5ZvqllLIJ6g5IqlEGueLmQNd8V3rvhC2WiuCZy5jn6EBjzlq_0Sa3tJljmfLd2L5U4dxnqBor4m2uha1fH3AELPzG0Eb2irOIGZziadp0vco16qI5hPLkbT9mYd8GrxMFEsogE5ZarKPpREfM_qQzfPHZyaZeC_KxeW66vYheatl06MvEwkUoQ1GRn0VwR6JMkjyhcTHZcGUlyIrr-UenfWZTx0dE4026xlB0INbj1S_4OiGvDmVlZf07ku3EkRukdb4gAb0JslzKtm_m_TAk3qdrSfGajF33Mxg',
          },
        ],
      },
    });
  });

  it('should parse post with many videos', async () => {
    expect(parseTelegramPost(await readFile('many-videos.html'))).toEqual({
      type: 'post',
      post: {
        id: 42053,
        channel: { id: 1005031786, name: 'tvrain', title: 'Телеканал Дождь' },
        date: 1617797690000,
        link: 'https://t.me/tvrain/42053',
        bodyText:
          'Из Мосгорсуда эвакуируют людей. Сегодня там должны проходить заседания по «санитарному делу» Видео: Василий Крестьянинов; телеграм-канал «Меркури»',
        media: [
          {
            type: 'video',
            url:
              'https://cdn4.telesco.pe/file/206b9e613f.mp4?token=mNPy-STSO8JSRx6cxhG2VBOzDW1JehNntzuGrW3gBBhNMUZ6ZuhLfNsd3nbucqqG-KAam0aTOrWc3ZenA8OZcPXFuJ3QXFnT7huD5N1l9UuuwJqkJFtxAZ_vZpO_IIiEm-brWAQaALJBDP-p2bSK5AvOBrer7CIMOcY5MbfVcWusDBpbPbqVCCY_HehAa_RnnSeMC1ZVTtvURGDk8G-AJ7OcdAHH-CMSqmZPW_xheIKbsdWSXPC2wJUJdHvV7Nz29UN-1u9ugH-fbh2uc5f9PnizX6LP-Gt26KktEGYIyLgi-jiUXBwciA8ltAVqe8uYxSt82jZNq3q_HO9NeFO7aQ',
            thumbUrl:
              'https://cdn4.telesco.pe/file/iAOoksBCJDHxygER7Zqq9Sr5kD9zJrXK-nMQ5wIFXMcIxPww4G3P1tVRzyiG6XmpbBEauuqhUgh4tpi5pEL24omzWLSyTK7n1UNg0Gni2hlQaJ4PErMcZqeuJPuPckgcU_yOK7aCme3NI1QjlHMAc0oPNaAhf9BGH3L64qh1ZBpcrFV2PMnn3K4WbvNJZx8hwrRz69-vEe4yxsA1Dl6aiNFYP4fzL3ZXXph87avY0vpqTyr6zOJJ7V7t5V6MDROZZjVdfS11cJaFVSpFnFIFiHeHRGcNA-xtHZ3FjhqrLvdWZqdu9nqiA3tdT3zwdkQwVzI5tO2-h6g0SiPma8YXpw',
            duration: '0:11',
          },
          {
            type: 'video',
            url:
              'https://cdn4.telesco.pe/file/aa27d99746.mp4?token=LZxRt7RzTW7j_Y7d5F3KYINDR_y-EH42DIrCAPIplXLLZJz8HPM1JthStT1hDopECNF974X--YasFZSywrvjKTvgfREAolK9VbcNf55JHEFJ4hJdQUeLi5NjimE-MJifsWQ6hmnkp9ep8cT-DoCTrtyRJihGmZXnrJ-N4HV0x7MgDVEvvnx6d6-HtlOWihYJB6hIvtac9h9NrA_69SD_uREiCSmFsQk-bQcscz_ysvCMAn9oivT87l_ZvfxLFaPdVBX6O6e9T_BgR18HX-OQIUCyHJBA-k4cxNShxexIMcg-kAvpbU5Wm-Qz9JDROu2rWNKz5xS1xTzDYfGmC09T_Q',
            thumbUrl:
              'https://cdn4.telesco.pe/file/qcsK33RzTX9lLBkKopwJYB2XIEqvCneJGCMXKqCKHzWxa36DyufOHyXkvszQFbCPiiAnnl6S6XULj1JGph2n3mYf1JUprzZ3tjIxnXxyAp2w5cZ7HWS73p1lKL-bG8NSexvX4YFb4TV8m3A3gmKlcQnd8YIsiZGDiSApo_wiLhQpG0WKB7haLBkxbqIVLgsEIsl4yRgjyScR98TkQsvoHS9zrvel5j8PL_IRnxr2HivLjj4zP79vnxu0GvLHR2uY6MRc3oO21cfdv1F04Tn1qpgwx5muSnlN_1SgnczjUvDbZplKR86gw76gYuDaNG_Lk0_KWVoF6VHbmDMm3aLoxA',
            duration: '0:11',
          },
          {
            type: 'video',
            url:
              'https://cdn4.telesco.pe/file/9557b51134.mp4?token=qvMJHeJKGRB_wxn3G53N43dLYUEnUd1p85Ymntlfqwz0_z_4n5a6btZeUMtTcJKrmAjV29ix2Q3uGFmM9X3YMj7NxYQmj2zVqtq_2VHULd7dlfBkEbir_yYWoOnz3OOJHCkfyf-YMdaJiZ6g23cOIedzZGwZ8crIl-y3l0FabLsRzVfwmVzxRQpZLTwXFs0WaBZgdd3BPr-J_PHzdPpmxygbLZUMQ7zXj6q8A70_6zh_E8XrRTJSjAzBAems38iT3QB1PttchHlFVYllj8dnZgZYYXBLJN6XpgWgAAx2KObUzlIj5KLjeINhz2xiVqpmfsMHu2hA71TNF6W-yL1otw',
            thumbUrl:
              'https://cdn4.telesco.pe/file/X7L_4WdeG6CSJSIypCPIHjvrJIJZWG7saLaga7tWbV161woVIDzYNKbDn3HkE6nzAJuBpSLsdoMQ2zwxPwnAXK6mOLhkvsrQmUgRt-BzOmVLMl1iCXky1jsUqLdQSjGyLse6yVHMQzyIyhIhLWYTf0IsT5BaLW9Wu5s7YQk6m8-hUoXl9bFEYDCw90GxNJOiXf0RrD7ToOB1fhHSStgOS6AczdJw_zZY2HbidUZHM4Ho57MsQ92v4Cwft6oF_9FRFzHTglxhPZkrcVOr8LHd2soDbLMPI2Nl32QwCrM0omgsKyoFmfDm1gVCwY-BWEGjblTM_FEqy95cKTKaaL9jIQ',
            duration: '0:13',
          },
        ],
      },
    });
  });

  it('should parse post with one audio', async () => {
    expect(parseTelegramPost(await readFile('one-audio.html'))).toEqual({
      type: 'post',
      post: {
        id: 129,
        channel: { id: 1455926914, name: 'melhagram', title: 'Ебейший Чилзон' },
        date: 1620464489000,
        link: 'https://t.me/melhagram/129',
        bodyText: '',
        media: [
          {
            type: 'audio',
            url:
              'https://cdn4.telesco.pe/file/db43c128e1.ogg?token=rPxTPK7D7RzKyQ58simHKy92BbjAma7VViRonz9x6ahfGU3RPBeJvaGCdEe0oIXCpSVslOiZBUYwFFG_JJ-aQfaPANPHYFF233VdezvUT32pqXi6I2B9Om-CNiWpCdWcZ4EMKlaXHV01TFHZHjJTZWsykb-sKrqO9hjYzG1WU092D9s921LT8IRNTWAmDKpnH5nwptskh4iJmt6GsAmJBz0MDYdk0Ur5kFBDPC-gUNWz-jUZZTBNcLXI5f13I2ZzqmdZPRf-o8NWZyXTBRJcAoA9SCzI0sJEFauY_PXHBgB6TPY1Dg3_llf2MsTD2nSAyRQlkeg7lH3jYArLYqpU-g',
            duration: '0:51',
          },
        ],
      },
    });
  });

  it('should parse post with images and videos', async () => {
    expect(parseTelegramPost(await readFile('videos-and-images.html'))).toEqual(
      {
        type: 'post',
        post: {
          id: 2252,
          channel: {
            id: 1259564118,
            name: 'streaminside',
            title: 'STREAM INSIDE',
          },
          date: 1618133581000,
          link: 'https://t.me/streaminside/2252',
          bodyText:
            "👀 Моргенштерн встретился с «кумиром всей своей жизни» — #Valakas'ом",
          media: [
            {
              type: 'image',
              url:
                'https://cdn4.telesco.pe/file/Fp_E1TSZsPnPQBD-wI8QSOJ_UsQd1D47-sE_lLEYBH-Dce3i_kIb9CLfaB9E5FHNUTTOISEdgz10yVYv_3GAAXZ3LeaDizsT9uJ1v0GUKGsRvhVihRK-UH4QBsJ81G6dErSCYXth03QkQ7e8Ek5EcVGj1xTI5FHYgeQR4YXauUh0M1ks-YORkYX0DlJvmav2H_cPWO1oVQr0ulQDxO3HqMxzLS5555bMf5OITHS64w9kbj4cCJDsTXIx3PmlVPBhB5_MVLMlrG9wuhlhTNHzFqGaPXTLWAzwu25o4AKjtWILcknSX3e5tpApt_TZliaUrn88RUWTZlZEUdXbxCzMuA.jpg',
            },
            {
              type: 'video',
              url:
                'https://cdn4.telesco.pe/file/b8ca9eff42.mp4?token=hLEOrkfJcKzSmP5RrR630F1VlYhA-O8Zxk0gfLHnwObC5IslbW9_-D-9cUGAJygPVe_Zpy5hhdaMm5x0Ze73wC7uJL1udE7crpy-GwIQzgo4cQdEkkXWE1mkfOKBRtetI_3xZzudxbWOpmGn9rXHOo3kwYdLyUS8_7vogawpcgVu04eCg1ARz5CMD2pCoiZVfnzO1mAW19eawZ1b9SZH4-qkvkFBtm4lBMmelokSAfz3VJafUnxoQZ3icElFz8aEx5eNIUyLNJ4fWZL-YM_PpZhCQmf_F5-6XnDuporlguQMOAYy-adtkDW6X5LWr0kxOjLFSspCsOfCQmYXZaOdCA2MBWhlYz3wHddXItOOsBAX39q4vq0vCzGvxrhjGzpNIImUVAx8lKQd8YZ_6cUjHH7jj_SG063nh88_5KiKNNHKBk34OsMdzLIpOyRNe7Yu1zfS4Pf9qLAw_eaqWaIC07W68ttgtabykRvl6rHK5eNgg_RwkJZZ1K1SgMmxrXxQ0D_y2jUweW3XtsJ_k-r0ZMFkJ_M1cf4iGXfl6HMCopLj_hcW_2fJf36opHe4hSO99r9GirkUm1hpO3z6w1fc49Lv4Dgd1qMWSiSNrtZm_mZlxwFsWYSuHEefWQROB7YvUnuwtCHoGxqs8cB4UkNYxoJnbU1ti01azl-FCpX9fyk',
              thumbUrl:
                'https://cdn4.telesco.pe/file/M9purjEYuHklc69ZbW5GAZFEs210yc1nIfmNqatNs7H6OtgVKsTKfmsgN1f4NJgZyJBQyw_HYH-MEV8XVT-OiJhiBCuXvt6nbk0cRP54E5l18RSDP11FScpCKjlav7i3hmyLjzC39pSR1nGLNkVrhjjjliBmdzhWYX8-pqbA5DuoFALNwRvyQn3NrQJ-ORNXBK_lRwjX5JaXZCwMe7rOSleGZSWzQXomPHWqvzqYsHl6lgWA8kXRRNts6Onlf1Ml0pNS9LaoXZtHwLZoVBZ5Pflptcz-_wvE3-o-HJS8HA1DJCvXpzEYxIsb1YDCzKjd3jj5Qd9V3Khd3acLRZ53eQ',
              duration: '0:12',
            },
          ],
        },
      },
    );
  });
});
