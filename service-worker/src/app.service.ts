import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { ServiceNotifications } from './schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

const EVENTS = {
  NOTIFY_SERVICE_DOWN_TIME: 'notify_service_down_time',
};

const SERVICE_ID = '8585-linken-sphere-automation-service',
  MAX_NOTIFICATIONS = 4,
  DOWN_TIME_INTERVALS = {
    _5_MINUTES: 300000,
    _15_MINUTES: 900000,
    _30_MINUTES: 1800000,
    _1_HOUR: 3600000,
  };

enum SERVICE_STATUS {
  OK = 'ok',
  DOWN = 'down',
}

@Injectable()
export class AppService {
  constructor(
    private httpService: HttpService,
    private eventEmitter: EventEmitter2,
    @InjectModel(ServiceNotifications.name)
    private readonly serviceNotificationsModel: Model<ServiceNotifications>,
  ) {}
  async getAppHealth(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'up',
      timestamp: new Date().toISOString(),
    };
  }

  //every minute
  @Cron('0 * * * * *')
  async getSphereHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.httpService.axiosRef.get(
        'http://localhost:8085/health',
      );

      await this.serviceNotificationsModel.findOneAndUpdate(
        {
          service_id: SERVICE_ID,
        },
        {
          status: response.data.status,
        },
        { new: true },
      );
      return {
        status: response.data.status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.eventEmitter.emit(EVENTS.NOTIFY_SERVICE_DOWN_TIME);
      return {
        status: 'down',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async sendEmailNotification() {
    const status = await this.getSphereHealth();
    if (status.status === 'down') {
      const data = JSON.stringify({
        to: ['iworker.developer@gmail.com'],
        html: `
        Hello, Team, 
        <br>
        <br>
        The LinkenSphere automation service tool is currently experiencing a downtime. 
        <br>
        Kindly log in to the VM and re-start the service.

        <br>
        <br>
        <br>
        Warm Regards,
        <p style="color:blue;">Support Bot</p>
        `,
        subject: 'Linken Shere Automation Service DownTime',
        recipientName: 'Baraka',
      });

      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://ba.iworker-apps.me/notifications/send-email',
        headers: {
          'Content-Type': 'application/json',
        },
        data: data,
      };

      this.httpService.axiosRef
        .request(config)
        .then((response) => {
          console.log(JSON.stringify(response.data));
        })
        .catch((error) => {
          console.log({
            e: error?.response?.data,
          });
        });

      return false;
    } else {
      return true;
    }
  }

  @OnEvent(EVENTS.NOTIFY_SERVICE_DOWN_TIME)
  async timelyEmailNotification() {
    try {
      // find the service notification by service id
      let serviceNotification = await this.serviceNotificationsModel.findOne({
        service_id: SERVICE_ID,
      });

      if (
        serviceNotification &&
        serviceNotification.status === 'down' &&
        serviceNotification.successful_notifications_count < MAX_NOTIFICATIONS
      ) {
        return;
      }

      if (!serviceNotification) {
        //create a new service notification
        serviceNotification = await this.serviceNotificationsModel.create({
          service_id: SERVICE_ID,
          status: SERVICE_STATUS.DOWN,
          max_no_of_notifications: MAX_NOTIFICATIONS,
          successful_notifications_count: 0,
        });
      }

      const maxNotifications = serviceNotification.max_no_of_notifications,
        successful_notifications_count =
          serviceNotification.successful_notifications_count;

      if (successful_notifications_count >= maxNotifications) {
        serviceNotification =
          await this.serviceNotificationsModel.findOneAndUpdate(
            {
              service_id: SERVICE_ID,
            },
            {
              status: SERVICE_STATUS.DOWN,
              successful_notifications_count: 0,
            },
            { new: true },
          );
      }

      const incrementNotificationCount = async () => {
        await this.serviceNotificationsModel.findOneAndUpdate(
          {
            service_id: SERVICE_ID,
          },
          {
            $inc: { successful_notifications_count: 1 },
          },
          { new: true },
        );
      };

      await this.sendEmailNotification();
      await incrementNotificationCount();
      setTimeout(async () => {
        await this.sendEmailNotification();
        await incrementNotificationCount();
      }, DOWN_TIME_INTERVALS._15_MINUTES);
      setTimeout(async () => {
        await this.sendEmailNotification();
        await incrementNotificationCount();
      }, DOWN_TIME_INTERVALS._30_MINUTES);
      setTimeout(async () => {
        await this.sendEmailNotification();
        await incrementNotificationCount();
      }, DOWN_TIME_INTERVALS._1_HOUR);
    } catch (error) {
      console.log(error);
    }
  }
}
