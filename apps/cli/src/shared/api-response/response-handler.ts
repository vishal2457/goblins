import { Response } from "express";
import { StatusCodes } from "./http-status-code";
import { ReasonPhrases } from "./reason-phrase";

const reasonPhraseByStatusCode: Partial<Record<StatusCodes, ReasonPhrases>> = {
  [StatusCodes.OK]: ReasonPhrases.OK,
  [StatusCodes.CREATED]: ReasonPhrases.CREATED,
};

export const success = (
  res: Response,
  data: any,
  msg: string,
  statusCode: StatusCodes = StatusCodes.OK,
) => {
  const response = {
    result: data,
    status: reasonPhraseByStatusCode[statusCode] ?? ReasonPhrases.OK,
    statusCode,
    msg,
  };
  res.status(response.statusCode).send(response);
};

export const other = (
  res: Response,
  msg: string,
  statusCode: StatusCodes = StatusCodes.BAD_REQUEST,
) => {
  const response = {
    success: false,
    message: msg,
    statusCode,
  };
  res.status(statusCode).send(response);
};
